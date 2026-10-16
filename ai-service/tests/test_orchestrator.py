import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.llm.orchestrator import Orchestrator, RespostaLLM
from app.rag.stores.base import Trecho


@pytest.mark.asyncio
async def test_orchestrator_passes_same_now_to_context_and_system_prompts():
    orchestrator = Orchestrator(api_key="fake-gemini-key")

    fixed_now = datetime(2026, 10, 16, 10, 0, 0, tzinfo=timezone(timedelta(hours=-3)))

    # Mock content generation
    mock_resp = MagicMock()
    mock_resp.function_calls = None
    mock_resp.text = "Resposta do modelo."
    orchestrator._generate_content_with_fallback = AsyncMock(return_value=(mock_resp, "gemini-3-flash-preview"))

    with patch("app.llm.orchestrator._get_now_br", return_value=fixed_now) as mock_get_now, \
         patch("app.llm.orchestrator.build_context_prompt", wraps=lambda m, t, r, now=None: f"CTX_PROMPT[{now.isoformat()}]") as mock_build_ctx, \
         patch("app.llm.orchestrator.build_system_prompt", wraps=lambda now=None: f"SYS_PROMPT[{now.isoformat()}]") as mock_build_sys:

        res = await orchestrator.responder(
            mensagem="Qual o meu faturamento?",
            historico=[],
            trechos=[],
            rag_backend="chroma",
            mcp_session=None
        )

        # 1. _get_now_br must be called exactly once
        assert mock_get_now.call_count == 1

        # 2. Both prompt builders must be called exactly once with the same 'now' value
        mock_build_ctx.assert_called_once_with(
            "Qual o meu faturamento?",
            [],
            "chroma",
            now=fixed_now
        )
        mock_build_sys.assert_called_once_with(
            now=fixed_now
        )

        # 3. Verify that the passed object to both functions is identical
        ctx_call_now = mock_build_ctx.call_args.kwargs.get("now")
        sys_call_now = mock_build_sys.call_args.kwargs.get("now")
        assert ctx_call_now is fixed_now
        assert sys_call_now is fixed_now
        assert ctx_call_now is sys_call_now

        # 4. Verify the config passed to model generation used the dynamic system prompt
        assert orchestrator._generate_content_with_fallback.call_count == 1
        call_kwargs = orchestrator._generate_content_with_fallback.call_args.kwargs
        config = call_kwargs["config"]
        assert config.system_instruction == f"SYS_PROMPT[{fixed_now.isoformat()}]"

        # 5. Verify the user content part includes the context prompt
        contents = call_kwargs["contents"]
        assert len(contents) == 1
        assert contents[0].role == "user"
        assert f"CTX_PROMPT[{fixed_now.isoformat()}]" in contents[0].parts[0].text

        assert res.resposta == "Resposta do modelo."


@pytest.mark.asyncio
async def test_orchestrator_time_sync_without_mocking_now():
    """Without mocking _get_now_br, verify the runtime datetime instance passed to both prompt builders is identical."""
    orchestrator = Orchestrator(api_key="fake-gemini-key")

    mock_resp = MagicMock()
    mock_resp.function_calls = None
    mock_resp.text = "Tudo certo."
    orchestrator._generate_content_with_fallback = AsyncMock(return_value=(mock_resp, "gemini-3-flash-preview"))

    with patch("app.llm.orchestrator.build_context_prompt", side_effect=lambda m, t, r, now=None: "CTX") as mock_ctx, \
         patch("app.llm.orchestrator.build_system_prompt", side_effect=lambda now=None: "SYS") as mock_sys:

        await orchestrator.responder(
            mensagem="Olá",
            historico=[],
            trechos=[],
            rag_backend="chroma",
            mcp_session=None
        )

        ctx_now = mock_ctx.call_args.kwargs.get("now")
        sys_now = mock_sys.call_args.kwargs.get("now")

        assert ctx_now is not None
        assert sys_now is not None
        assert ctx_now is sys_now
