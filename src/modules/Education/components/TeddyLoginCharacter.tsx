import React, { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';

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
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 border-4 border-white dark:border-neutral-800">
          <span className="text-4xl sm:text-5xl select-none">🐻</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Halo de iluminação suave atrás do Teddy */}
      <div className="absolute inset-0 max-w-[260px] max-h-[260px] m-auto bg-gradient-to-tr from-amber-300/25 via-yellow-400/15 to-orange-400/15 rounded-full blur-2xl pointer-events-none" />

      {/* Canvas Rive do Teddy Bear (Escala responsiva perfeita para mobile e desktop) */}
      <div className="relative w-52 h-52 xs:w-60 xs:h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 -mb-4 sm:-mb-6 pointer-events-none drop-shadow-xl transition-all">
        <RiveComponent className="w-full h-full" />
      </div>
    </div>
  );
};

