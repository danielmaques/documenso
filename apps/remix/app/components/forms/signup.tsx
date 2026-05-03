import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Turnstile } from '@marsidev/react-turnstile';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { authClient } from '@documenso/auth/client';
import { useAnalytics } from '@documenso/lib/client-only/hooks/use-analytics';
import { ZNameSchema } from '@documenso/lib/constants/auth';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { env } from '@documenso/lib/utils/env';
import { zEmail } from '@documenso/lib/utils/zod';
import { ZPasswordSchema } from '@documenso/trpc/server/auth-router/schema';
import { Button } from '@documenso/ui/primitives/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { PasswordInput } from '@documenso/ui/primitives/password-input';
import { SignaturePadDialog } from '@documenso/ui/primitives/signature-pad/signature-pad-dialog';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { AuthShell } from '~/components/general/auth/auth-shell';
import { SocialAuthButtons } from '~/components/general/auth/social-auth-buttons';

export const ZSignUpFormSchema = z
  .object({
    name: ZNameSchema,
    email: zEmail().min(1),
    password: ZPasswordSchema,
    signature: z.string().min(1, { message: msg`We need your signature to sign documents`.id }),
  })
  .refine(
    (data) => {
      const { name, email, password } = data;
      return !password.includes(name) && !password.includes(email.split('@')[0]);
    },
    {
      message: msg`Password should not be common or based on personal information`.id,
      path: ['password'],
    },
  );

export const SIGNUP_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  SIGNUP_DISABLED: msg`Signup is currently disabled or not available for your email domain.`,
  [AppErrorCode.ALREADY_EXISTS]: msg`We were unable to create your account. If you already have an account, try signing in instead.`,
  [AppErrorCode.INVALID_REQUEST]: msg`We were unable to create your account. Please review the information you provided and try again.`,
};

export type TSignUpFormSchema = z.infer<typeof ZSignUpFormSchema>;

export type SignUpFormProps = {
  className?: string;
  initialEmail?: string;
  isGoogleSSOEnabled?: boolean;
  isMicrosoftSSOEnabled?: boolean;
  isOIDCSSOEnabled?: boolean;
  returnTo?: string;
};

const inputClasses =
  'h-11 rounded-lg border-border/70 bg-background/60 transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-documenso-400/60 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_4px_rgba(249,115,22,0.18)]';

export const SignUpForm = ({
  className,
  initialEmail,
  isGoogleSSOEnabled,
  isMicrosoftSSOEnabled,
  isOIDCSSOEnabled,
  returnTo,
}: SignUpFormProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const analytics = useAnalytics();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const utmSrc = searchParams.get('utm_source') ?? null;

  const turnstileSiteKey = env('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const hasSocialAuthEnabled = isGoogleSSOEnabled || isMicrosoftSSOEnabled || isOIDCSSOEnabled;

  const form = useForm<TSignUpFormSchema>({
    values: {
      name: '',
      email: initialEmail ?? '',
      password: '',
      signature: '',
    },
    mode: 'onBlur',
    resolver: zodResolver(ZSignUpFormSchema),
  });

  const isSubmitting = form.formState.isSubmitting;

  const onFormSubmit = async ({ name, email, password, signature }: TSignUpFormSchema) => {
    try {
      await authClient.emailPassword.signUp({
        name,
        email,
        password,
        signature,
        captchaToken: captchaToken ?? undefined,
      });

      await navigate(returnTo ? returnTo : '/unverified-account');

      toast({
        title: _(msg`Registration Successful`),
        description: _(
          msg`You have successfully registered. Please verify your account by clicking on the link you received in the email.`,
        ),
        duration: 5000,
      });

      analytics.capture('App: User Sign Up', {
        email,
        timestamp: new Date().toISOString(),
        custom_campaign_params: { src: utmSrc },
      });
    } catch (err) {
      const error = AppError.parseError(err);

      const errorMessage =
        SIGNUP_ERROR_MESSAGES[error.code] ?? SIGNUP_ERROR_MESSAGES.INVALID_REQUEST;

      toast({
        title: _(msg`An error occurred`),
        description: _(errorMessage),
        variant: 'destructive',
      });

      turnstileRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  const onSignUpWithGoogleClick = async () => {
    try {
      await authClient.google.signIn();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(
          msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`,
        ),
        variant: 'destructive',
      });
    }
  };

  const onSignUpWithMicrosoftClick = async () => {
    try {
      await authClient.microsoft.signIn();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(
          msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`,
        ),
        variant: 'destructive',
      });
    }
  };

  const onSignUpWithOIDCClick = async () => {
    try {
      await authClient.oidc.signIn();
    } catch (err) {
      toast({
        title: _(msg`An unknown error occurred`),
        description: _(
          msg`We encountered an unknown error while attempting to sign you Up. Please try again later.`,
        ),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    const params = new URLSearchParams(hash);

    const email = params.get('email');

    if (email) {
      form.setValue('email', email);
    }
  }, [form]);

  return (
    <Form {...form}>
      <AuthShell
        className={className}
        size="wide"
        title={<Trans>Create a new account</Trans>}
        description={
          <Trans>Create your account and start using state-of-the-art document signing.</Trans>
        }
        footerSlot={
          <p className="text-xs text-muted-foreground">
            <Trans>
              By proceeding, you agree to our{' '}
              <Link
                to="https://documen.so/terms"
                target="_blank"
                className="font-medium text-foreground/80 transition-colors hover:text-documenso-700"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="https://documen.so/privacy"
                target="_blank"
                className="font-medium text-foreground/80 transition-colors hover:text-documenso-700"
              >
                Privacy Policy
              </Link>
              .
            </Trans>
          </p>
        }
      >
        <form className="flex w-full flex-col gap-y-4" onSubmit={form.handleSubmit(onFormSubmit)}>
          <fieldset className="flex w-full flex-col gap-y-4" disabled={isSubmitting}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Full Name</Trans>
                  </FormLabel>
                  <FormControl>
                    <Input type="text" autoComplete="name" className={inputClasses} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Email Address</Trans>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" className={inputClasses} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Password</Trans>
                  </FormLabel>

                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      className={inputClasses}
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="signature"
              render={({ field: { onChange, value } }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Sign Here</Trans>
                  </FormLabel>
                  <FormControl>
                    <SignaturePadDialog
                      disabled={isSubmitting}
                      value={value}
                      onChange={(v) => onChange(v ?? '')}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {turnstileSiteKey && (
              <Turnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                options={{
                  size: 'flexible',
                  appearance: 'interaction-only',
                }}
              />
            )}

            <Button
              loading={isSubmitting}
              type="submit"
              size="lg"
              className="mt-2 h-11 rounded-lg bg-documenso-500 text-foreground shadow-sm transition-all duration-200 hover:bg-documenso-500/90 hover:shadow-md active:scale-[0.99] dark:bg-documenso dark:hover:bg-documenso/90"
            >
              <Trans>Create account</Trans>
            </Button>

            {hasSocialAuthEnabled && (
              <SocialAuthButtons
                mode="signup"
                isGoogleSSOEnabled={isGoogleSSOEnabled}
                isMicrosoftSSOEnabled={isMicrosoftSSOEnabled}
                isOIDCSSOEnabled={isOIDCSSOEnabled}
                disabled={isSubmitting}
                dividerLabel={<Trans>Or</Trans>}
                onGoogleClick={onSignUpWithGoogleClick}
                onMicrosoftClick={onSignUpWithMicrosoftClick}
                onOIDCClick={onSignUpWithOIDCClick}
              />
            )}

            <p className="mt-2 text-center text-sm text-muted-foreground">
              <Trans>
                Already have an account?{' '}
                <Link
                  to="/signin"
                  className="font-medium text-foreground transition-colors hover:text-documenso-700"
                >
                  Sign in instead
                </Link>
              </Trans>
            </p>
          </fieldset>
        </form>
      </AuthShell>
    </Form>
  );
};
