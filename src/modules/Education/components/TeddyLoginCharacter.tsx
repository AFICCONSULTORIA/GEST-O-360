import React, { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { Zap } from 'lucide-react';

export interface TeddyLoginCharacterProps {
  isUsernameFocused: boolean;
  usernameLength: number;
  isPasswordFocused: boolean;
  isPasswordVisible: boolean;
  isSuccess: boolean;
  isFail: boolean;
  className?: string;
}

const STATE_MACHINE_NAME = 'Login Machine';

export const TeddyLoginCharacter: React.FC<TeddyLoginCharacterProps> = ({
  isUsernameFocused,
  usernameLength,
  isPasswordFocused,
  isPasswordVisible,
  isSuccess,
  isFail,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: '/login-teddy.riv',
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoadError: () => {
      setHasError(true);
    }
  });

  const isCheckingInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'isChecking');
  const numLookInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'numLook');
  const isHandsUpInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'isHandsUp');
  const trigSuccessInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'trigSuccess');
  const trigFailInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'trigFail');

  // Controle de olhar o campo de usuário / matrícula
  useEffect(() => {
    if (!rive) return;

    if (isPasswordFocused) {
      if (isHandsUpInput) {
        // Se a senha estiver visível (olhinho aberto), o Teddy abaixa as patas e fica surpreso!
        isHandsUpInput.value = !isPasswordVisible;
      }
      if (isCheckingInput) {
        isCheckingInput.value = isPasswordVisible;
      }
      return;
    }

    if (isUsernameFocused) {
      if (isHandsUpInput) isHandsUpInput.value = false;
      if (isCheckingInput) isCheckingInput.value = true;
      if (numLookInput) {
        // Ajusta a rotação dos olhos conforme a quantidade de caracteres digitados
        numLookInput.value = Math.min(100, Math.max(0, usernameLength * 4.5));
      }
      return;
    }

    // Se nenhum campo estiver focado
    if (isHandsUpInput) isHandsUpInput.value = false;
    if (isCheckingInput) isCheckingInput.value = false;
  }, [
    rive,
    isUsernameFocused,
    usernameLength,
    isPasswordFocused,
    isPasswordVisible,
    isHandsUpInput,
    isCheckingInput,
    numLookInput
  ]);

  // Disparo de Sucesso (Comemoração com os braços no ar)
  useEffect(() => {
    if (!rive || !isSuccess) return;
    if (isHandsUpInput) isHandsUpInput.value = false;
    if (isCheckingInput) isCheckingInput.value = false;
    trigSuccessInput?.fire();
  }, [rive, isSuccess, trigSuccessInput, isHandsUpInput, isCheckingInput]);

  // Disparo de Falha (Negação e vergonha)
  useEffect(() => {
    if (!rive || !isFail) return;
    if (isHandsUpInput) isHandsUpInput.value = false;
    trigFailInput?.fire();
  }, [rive, isFail, trigFailInput, isHandsUpInput]);

  if (hasError) {
    // Fallback decorativo amigável caso WebGL/Canvas falhe
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 border-4 border-white dark:border-neutral-800">
          <span className="text-5xl select-none">🐻</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Halo de energia sutil atrás do Teddy */}
      <div className="absolute inset-0 max-w-[300px] max-h-[300px] m-auto bg-gradient-to-tr from-amber-300/30 via-yellow-400/20 to-orange-400/20 rounded-full blur-2xl pointer-events-none" />

      {/* Canvas Rive do Teddy Bear Ampliado */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-[340px] md:h-[340px] -mb-6 pointer-events-none drop-shadow-2xl">
        <RiveComponent className="w-full h-full" />
      </div>

      {/* Selo interativo "Mascote dos Estudos" com o raio */}
      <div className="relative z-10 -mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-amber-300/80 dark:border-amber-500/40 text-xs font-black text-amber-700 dark:text-yellow-300 shadow-md">
        <Zap size={13} className="text-amber-500 dark:text-yellow-400 fill-current animate-pulse" />
        <span>Teddy · Mascote do Aluno</span>
        <span className="text-xs">⚡</span>
      </div>
    </div>
  );
};

