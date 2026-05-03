import { useEffect, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Link, redirect, useSearchParams } from 'react-router';

import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import {
  IS_GOOGLE_SSO_ENABLED,
  IS_MICROSOFT_SSO_ENABLED,
  IS_OIDC_SSO_ENABLED,
  OIDC_PROVIDER_LABEL,
} from '@documenso/lib/constants/auth';
import { env } from '@documenso/lib/utils/env';
import { isValidReturnTo, normalizeReturnTo } from '@documenso/lib/utils/is-valid-return-to';
import { Alert, AlertDescription } from '@documenso/ui/primitives/alert';

import { SignInForm } from '~/components/forms/signin';
import { SIGNUP_ERROR_MESSAGES } from '~/components/forms/signup';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/signin';

export function meta() {
  return appMetaTags(msg`Sign In`);
}

export async function loader({ request }: Route.LoaderArgs) {
  const { isAuthenticated } = await getOptionalSession(request);

  // SSR env variables.
  const isGoogleSSOEnabled = IS_GOOGLE_SSO_ENABLED;
  const isMicrosoftSSOEnabled = IS_MICROSOFT_SSO_ENABLED;
  const isOIDCSSOEnabled = IS_OIDC_SSO_ENABLED;
  const oidcProviderLabel = OIDC_PROVIDER_LABEL;

  let returnTo = new URL(request.url).searchParams.get('returnTo') ?? undefined;

  returnTo = isValidReturnTo(returnTo) ? normalizeReturnTo(returnTo) : undefined;

  if (isAuthenticated) {
    throw redirect(returnTo || '/');
  }

  return {
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    oidcProviderLabel,
    returnTo,
  };
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const {
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    oidcProviderLabel,
    returnTo,
  } = loaderData;

  const { _ } = useLingui();

  const [searchParams] = useSearchParams();
  const [isEmbeddedRedirect, setIsEmbeddedRedirect] = useState(false);

  const errorParam = searchParams.get('error');
  const signupError = errorParam ? SIGNUP_ERROR_MESSAGES[errorParam] : undefined;

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    const params = new URLSearchParams(hash);

    setIsEmbeddedRedirect(params.get('embedded') === 'true');
  }, []);

  const showSignupLink = !isEmbeddedRedirect && env('NEXT_PUBLIC_DISABLE_SIGNUP') !== 'true';

  return (
    <SignInForm
      isGoogleSSOEnabled={isGoogleSSOEnabled}
      isMicrosoftSSOEnabled={isMicrosoftSSOEnabled}
      isOIDCSSOEnabled={isOIDCSSOEnabled}
      oidcProviderLabel={oidcProviderLabel}
      returnTo={returnTo}
      headerSlot={
        signupError ? (
          <Alert variant="destructive" aria-live="polite">
            <AlertDescription>{_(signupError)}</AlertDescription>
          </Alert>
        ) : undefined
      }
      footerSlot={
        showSignupLink ? (
          <p className="text-sm text-muted-foreground">
            <Trans>
              Don't have an account?{' '}
              <Link
                to={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : '/signup'}
                className="font-medium text-foreground transition-colors hover:text-documenso-700"
              >
                Sign up
              </Link>
            </Trans>
          </p>
        ) : undefined
      }
    />
  );
}
