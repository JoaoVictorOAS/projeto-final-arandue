import json
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from google import genai
from google.genai import types

from app.rag.stores.base import Trecho
from app.llm.prompts import SYSTEM_PROMPT, build_context_prompt
from mcp.client.session import ClientSession

logger = logging.getLogger(__name__)

@dataclass
class RespostaLLM:
    resposta: str
    tools_usadas: List[str]
    modelo: str

class Orchestrator:
    def __init__(self, api_key: str, model_name: str = "gemini-3.5-flash-lite", max_tool_calls: int = 5):
        self.api_key = api_key
        self.model_name = model_name
        self.max_tool_calls = max_tool_calls
        self._client = genai.Client(api_key=self.api_key) if self.api_key else None

    async def _mcp_tools_to_declarations(self, session: Optional[ClientSession]) -> List[types.FunctionDeclaration]:
        if not session:
            return []
        tools_list = await session.list_tools()
        declarations = []
        for t in tools_list.tools:
            raw_schema = getattr(t, "input_schema", None) or getattr(t, "inputSchema", None) or {}
            if hasattr(raw_schema, "model_dump"):
                schema = raw_schema.model_dump()
            elif isinstance(raw_schema, dict):
                schema = raw_schema
            else:
                schema = {}

            # Converte tipos JSON Schema para maiúsculas compatíveis com o Gemini
            properties = {}
            for prop_name, prop_val in schema.get("properties", {}).items():
                p_type = str(prop_val.get("type", "STRING")).upper()
                properties[prop_name] = {
                    "type": p_type,
                    "description": prop_val.get("description", "")
                }
            parameters = {
                "type": "OBJECT",
                "properties": properties,
                "required": schema.get("required", [])
            }
            declarations.append(types.FunctionDeclaration(
                name=t.name,
                description=t.description or "",
                parameters=parameters
            ))
        return declarations

    async def responder(
        self,
        mensagem: str,
        historico: List[Dict[str, str]],
        trechos: List[Trecho],
        rag_backend: str,
        mcp_session: Optional[ClientSession] = None
    ) -> RespostaLLM:
        if not self._client:
            raise RuntimeError("GEMINI_API_KEY não configurada no serviço de IA.")

        prompt_conteudo = build_context_prompt(mensagem, trechos, rag_backend)
        contents: List[Any] = []

        # Adiciona histórico anterior (papel: usuario / assistente)
        for h in historico:
            papel = "user" if h.get("papel") == "usuario" else "model"
            contents.append(types.Content(
                role=papel,
                parts=[types.Part.from_text(text=h.get("texto", ""))]
            ))

        # Adiciona a pergunta atual com os trechos RAG
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt_conteudo)]
        ))

        # Prepara tools do MCP
        function_decls = await self._mcp_tools_to_declarations(mcp_session)
        tools = [types.Tool(function_declarations=function_decls)] if function_decls else None

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=tools,
            temperature=0.2
        )

        tools_usadas: List[str] = []
        calls_count = 0

        # Loop de Function Calling (até max_tool_calls)
        while calls_count < self.max_tool_calls:
            response = await self._client.aio.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )

            # Verifica se o modelo solicitou chamadas de função
            function_calls = response.function_calls
            if not function_calls:
                return RespostaLLM(
                    resposta=response.text or "Não foi possível gerar uma resposta para a consulta.",
                    tools_usadas=tools_usadas,
                    modelo=self.model_name
                )

            # O modelo gerou chamadas de tool
            contents.append(response.candidates[0].content)

            function_responses = []
            for call in function_calls:
                tool_name = call.name
                tool_args = call.args or {}
                tools_usadas.append(tool_name)
                calls_count += 1
                logger.info(f"Executando tool MCP: {tool_name}({tool_args})")

                tool_result_content = {}
                if mcp_session:
                    try:
                        res = await mcp_session.call_tool(tool_name, tool_args)
                        # Converte conteúdo retornado pelo MCP
                        if res and res.content:
                            partes = [c.text for c in res.content if hasattr(c, "text")]
                            texto_resultado = "\n".join(partes)
                            try:
                                tool_result_content = json.loads(texto_resultado)
                            except Exception:
                                tool_result_content = {"resultado": texto_resultado}
                        else:
                            tool_result_content = {"status": "ok"}
                    except Exception as e:
                        tool_result_content = {"erro": f"Falha ao executar ferramenta: {str(e)}"}
                else:
                    tool_result_content = {"erro": "Sessão MCP não disponível"}

                function_responses.append(types.Part.from_function_response(
                    name=tool_name,
                    response={"output": tool_result_content}
                ))

            contents.append(types.Content(
                role="user",
                parts=function_responses
            ))

        # Se atingir o limite de chamadas, faz uma chamada final para consolidar resposta
        final_response = await self._client.aio.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2
            )
        )
        return RespostaLLM(
            resposta=final_response.text or "Consulta processada com base nos dados do estabelecimento.",
            tools_usadas=tools_usadas,
            modelo=self.model_name
        )
