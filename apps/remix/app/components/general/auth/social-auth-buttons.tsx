import type { ReactNode } from 'react';

import { Trans } from '@lingui/react/macro';
import { FaIdCardClip } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';

import { Button } from '@documenso/ui/primitives/button';

import { AuthDivider } from './auth-divider';

export type SocialAuthButtonsProps = {
  mode: 'signin' | 'signup';
  isGoogleSSOEnabled?: boolean;
  isMicrosoftSSOEnabled?: boolean;
  isOIDCSSOEnabled?: boolean;
  oidcProviderLabel?: string;
  disabled?: boolean;
  dividerLabel?: ReactNode;
  onGoogleClick: () => void | Promise<void>;
  onMicrosoftClick: () => void | Promise<void>;
  onOIDCClick: () => void | Promise<void>;
};

const ssoButtonClasses =
  'group relative h-11 border border-border/70 bg-background/60 text-foreground/80 backdrop-blur-sm transition-all hover:border-border hover:bg-background hover:text-foreground hover:shadow-sm focus-visible:ring-documenso-400/60 active:scale-[0.99]';

export const SocialAuthButtons = ({
  mode,
  isGoogleSSOEnabled,
  isMicrosoftSSOEnabled,
  isOIDCSSOEnabled,
  oidcProviderLabel,
  disabled,
  dividerLabel,
  onGoogleClick,
  onMicrosoftClick,
  onOIDCClick,
}: SocialAuthButtonsProps) => {
  const hasAny = isGoogleSSOEnabled || isMicrosoftSSOEnabled || isOIDCSSOEnabled;

  if (!hasAny) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-3">
      <AuthDivider label={dividerLabel} />

      {isGoogleSSOEnabled && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={ssoButtonClasses}
          disabled={disabled}
          onClick={() => void onGoogleClick()}
        >
          <FcGoogle className="mr-2 h-5 w-5" />
          {mode === 'signup' ? <Trans>Sign Up with Google</Trans> : 'Google'}
        </Button>
      )}

      {isMicrosoftSSOEnabled && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={ssoButtonClasses}
          disabled={disabled}
          onClick={() => void onMicrosoftClick()}
        >
          <img className="mr-2 h-4 w-4" alt="Microsoft Logo" src={'/static/microsoft.svg'} />
          {mode === 'signup' ? <Trans>Sign Up with Microsoft</Trans> : 'Microsoft'}
        </Button>
      )}

      {isOIDCSSOEnabled && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={ssoButtonClasses}
          disabled={disabled}
          onClick={() => void onOIDCClick()}
        >
          <FaIdCardClip className="mr-2 h-5 w-5" />
          {mode === 'signup' ? <Trans>Sign Up with OIDC</Trans> : oidcProviderLabel || 'OIDC'}
        </Button>
      )}
    </div>
  );
};
