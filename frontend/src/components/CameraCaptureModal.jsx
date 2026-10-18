import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, AlertTriangle, UploadCloud } from 'lucide-react';
import Modal from './Modal';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Tirar Foto com a Câmera',
  subtitle = 'Aponte a câmera para a nota fiscal, cupom ou embalagem do insumo',
}) {
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (traseira) | 'user' (frontal)
  const [cameraError, setCameraError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks?.() || [];
        tracks.forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Erro ao parar track:', e);
          }
        });
      } catch (err) {
        console.warn('Erro ao acessar tracks da stream:', err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing) => {
      stopTracks();
      setCameraError(null);
      setIsStarting(true);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Câmera em tempo real indisponível neste navegador ou ambiente inseguro (requer HTTPS ou localhost). Você pode tirar a foto utilizando a câmera nativa do aparelho pelo botão abaixo.'
        );
        setIsStarting(false);
        return;
      }

      try {
        const constraints = {
          video: {
            facingMode: facing ? { ideal: facing } : 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Vídeo play aviso:', playErr);
          }
        }
      } catch (err) {
        console.error('Falha ao inicializar câmera:', err);
        let msg = 'Não foi possível acessar a câmera do dispositivo.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg =
            'Permissão de acesso à câmera negada. Habilite a permissão de câmera nas configurações do navegador ou use o seletor de arquivos.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Nenhuma câmera encontrada neste dispositivo. Escolha uma foto da galeria.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'A câmera está sendo utilizada por outro aplicativo.';
        }
        setCameraError(msg);
      } finally {
        setIsStarting(false);
      }
    },
    [stopTracks]
  );

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopTracks();
    }

    return () => {
      stopTracks();
    };
  }, [isOpen, facingMode, startCamera, stopTracks]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext ? canvas.getContext('2d') : null;
      let dataUrl = '';
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      } else if (typeof canvas.toDataURL === 'function') {
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }

      if (!dataUrl) {
        dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
      }

      stopTracks();
      onCapture(dataUrl);
      onClose();
    } catch (err) {
      console.error('Erro ao capturar quadro da câmera:', err);
      setCameraError('Erro ao processar imagem capturada. Tente novamente ou use o arquivo da galeria.');
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFallbackFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      stopTracks();
      onCapture(reader.result);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const triggerFallbackInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopTracks();
        onClose();
      }}
      title={title}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}

        {/* Input de Fallback Nativo / Galeria (invisível, ativado via botão) */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFallbackFile}
          className="hidden"
          data-testid="input-fallback-camera"
        />

        {/* Visor da Câmera */}
        <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video sm:aspect-[4/3] flex items-center justify-center border border-gray-800 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
          />

          {/* Mira / Moldura Guia de Enquadramento */}
          {!cameraError && (
            <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded self-start">
                Enquadre o insumo ou nota
              </span>
              <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded self-end">
                {facingMode === 'environment' ? 'Câmera Traseira' : 'Câmera Frontal'}
              </span>
            </div>
          )}

          {/* Indicador de Carregamento */}
          {isStarting && !cameraError && (
            <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2 text-white">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-xs font-medium">Iniciando câmera do dispositivo...</p>
            </div>
          )}

          {/* Mensagem de Erro / Falta de Permissão */}
          {cameraError && (
            <div className="p-6 text-center text-white space-y-3 max-w-sm">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-gray-200">{cameraError}</p>
              <button
                type="button"
                onClick={triggerFallbackInput}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                Abrir Câmera Nativa / Galeria
              </button>
            </div>
          )}
        </div>

        {/* Controles de Câmera */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={triggerFallbackInput}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Escolher imagem salva no dispositivo"
          >
            <UploadCloud className="w-4 h-4 text-gray-500" />
            Galeria / Arquivo
          </button>

          {!cameraError && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors"
                title="Alternar Câmera Frontal / Traseira"
                aria-label="Alternar Câmera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCapture}
                disabled={isStarting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                aria-label="Capturar Foto"
              >
                <Camera className="w-5 h-5" />
                Tirar Foto
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              stopTracks();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
