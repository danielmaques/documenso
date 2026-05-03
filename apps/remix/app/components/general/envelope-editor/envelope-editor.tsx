import { useEffect, useMemo, useRef, useState } from 'react';

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { EnvelopeType } from '@prisma/client';
import {
  ArrowLeftIcon,
  CopyPlusIcon,
  DownloadCloudIcon,
  EyeIcon,
  FileOutputIcon,
  LinkIcon,
  type LucideIcon,
  MousePointerIcon,
  SendIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { Link } from 'react-router';
import { match } from 'ts-pattern';

import type { EnvelopeEditorStep } from '@documenso/lib/client-only/providers/envelope-editor-provider';
import { useCurrentEnvelopeEditor } from '@documenso/lib/client-only/providers/envelope-editor-provider';
import { mapSecondaryIdToTemplateId } from '@documenso/lib/utils/envelope';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';

import { EnvelopeDeleteDialog } from '~/components/dialogs/envelope-delete-dialog';
import { EnvelopeDownloadDialog } from '~/components/dialogs/envelope-download-dialog';
import { EnvelopeDuplicateDialog } from '~/components/dialogs/envelope-duplicate-dialog';
import { EnvelopeRedistributeDialog } from '~/components/dialogs/envelope-redistribute-dialog';
import { EnvelopeSaveAsTemplateDialog } from '~/components/dialogs/envelope-save-as-template-dialog';
import { TemplateDirectLinkDialog } from '~/components/dialogs/template-direct-link-dialog';
import { EnvelopeEditorSettingsDialog } from '~/components/general/envelope-editor/envelope-editor-settings-dialog';

import { EnvelopeEditorFieldsPage } from './envelope-editor-fields-page';
import EnvelopeEditorHeader from './envelope-editor-header';
import { EnvelopeEditorPreviewPage } from './envelope-editor-preview-page';
import { EnvelopeEditorUploadPage } from './envelope-editor-upload-page';

type EnvelopeEditorStepData = {
  id: string;
  title: MessageDescriptor;
  icon: LucideIcon;
  description: MessageDescriptor;
};

const UPLOAD_STEP = {
  id: 'upload',
  title: msg`Document & Recipients`,
  icon: UploadIcon,
  description: msg`Upload documents and add recipients`,
};

const ADD_FIELDS_STEP = {
  id: 'addFields',
  title: msg`Add Fields`,
  icon: MousePointerIcon,
  description: msg`Place and configure form fields in the document`,
};

const PREVIEW_STEP = {
  id: 'preview',
  title: msg`Preview`,
  icon: EyeIcon,
  description: msg`Preview the document before sending`,
};

export const EnvelopeEditor = () => {
  const { t } = useLingui();

  const navigate = useNavigate();

  const {
    envelope,
    editorConfig,
    isDocument,
    isTemplate,
    relativePath,
    navigateToStep,
    syncEnvelope,
    flushAutosave,
    resetForms,
  } = useCurrentEnvelopeEditor();

  const [searchParams] = useSearchParams();

  const {
    general: { allowUploadAndRecipientStep, allowAddFieldsStep, allowPreviewStep },
    actions: {
      allowDistributing,
      allowDirectLink,
      allowDuplication,
      allowSaveAsTemplate,
      allowDownloadPDF,
      allowDeletion,
    },
  } = editorConfig;

  const envelopeEditorSteps = useMemo(() => {
    const steps: EnvelopeEditorStepData[] = [];

    if (allowUploadAndRecipientStep) {
      steps.push(UPLOAD_STEP);
    }

    if (allowAddFieldsStep) {
      steps.push(ADD_FIELDS_STEP);
    }

    if (allowPreviewStep) {
      steps.push(PREVIEW_STEP);
    }

    return steps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
  }, [editorConfig]);

  const searchParamsStep = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const searchParamStep = searchParams.get('step') as EnvelopeEditorStep | undefined;

    // Empty URL param equals upload, otherwise use the step URL param
    if (!searchParamStep) {
      return 'upload';
    }

    const validSteps: EnvelopeEditorStep[] = ['upload', 'addFields', 'preview'];

    if (validSteps.includes(searchParamStep)) {
      return searchParamStep;
    }

    return 'upload';
  }, [searchParams]);

  const [pageToRender, setPageToRender] = useState<EnvelopeEditorStep | 'loading'>(
    searchParamsStep,
  );

  const latestStepChangeTime = useRef(0);

  const handleStepChange = async (step: EnvelopeEditorStep) => {
    setPageToRender('loading');

    const currentTime = Date.now();
    latestStepChangeTime.current = currentTime;

    await flushAutosave().then(() => {
      if (currentTime !== latestStepChangeTime.current) {
        return;
      }

      resetForms();
      setPageToRender(step);
    });
  };

  // Watch the URL params and setStep if the step changes.
  useEffect(() => {
    const stepParam = searchParams.get('step') || envelopeEditorSteps[0].id;

    const foundStep = envelopeEditorSteps.find((step) => step.id === stepParam);

    if (foundStep && foundStep.id !== pageToRender) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      void handleStepChange(foundStep.id as EnvelopeEditorStep);
    }
  }, [searchParams]);

  const currentStepData =
    envelopeEditorSteps.find((step) => step.id === searchParamsStep) || envelopeEditorSteps[0];

  return (
    <div className="h-screen w-screen bg-envelope-editor-background">
      <EnvelopeEditorHeader />

      <div className="flex h-[calc(100vh-4rem)] w-screen flex-col overflow-hidden">
        <div className="border-b border-border/70 bg-background/95">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            {!editorConfig.embedded && (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link to={relativePath.basePath}>
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  {isDocument ? <Trans>Documents</Trans> : <Trans>Templates</Trans>}
                </Link>
              </Button>
            )}

            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="inline-flex min-w-max items-center gap-2">
                {envelopeEditorSteps.map((step) => {
                  const Icon = step.icon;
                  const isActive = searchParamsStep === step.id;

                  return (
                    <button
                      key={step.id}
                      data-testid={`envelope-editor-step-${step.id}`}
                      type="button"
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border/70 bg-background/70 text-muted-foreground hover:border-border hover:bg-muted/40',
                      )}
                      onClick={() => void navigateToStep(step.id as EnvelopeEditorStep)}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          isActive ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <span className="font-medium">{t(step.title)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="shrink-0 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
              <Trans context="The step counter">
                Step {currentStepData.order}/{envelopeEditorSteps.length}
              </Trans>
            </span>
          </div>

          <div className="border-t border-border/60 px-4 py-2 md:px-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {editorConfig.settings && (
                <EnvelopeEditorSettingsDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="shrink-0" title={t(msg`Settings`)}>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      {isDocument ? (
                        <Trans>Document Settings</Trans>
                      ) : (
                        <Trans>Template Settings</Trans>
                      )}
                    </Button>
                  }
                />
              )}

              {isDocument && allowDistributing && (
                <EnvelopeRedistributeDialog
                  envelope={envelope}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      title={t(msg`Resend Envelope`)}
                    >
                      <SendIcon className="mr-2 h-4 w-4" />
                      <Trans>Resend Document</Trans>
                    </Button>
                  }
                />
              )}

              {isTemplate && allowDirectLink && (
                <TemplateDirectLinkDialog
                  templateId={mapSecondaryIdToTemplateId(envelope.secondaryId)}
                  directLink={envelope.directLink}
                  recipients={envelope.recipients}
                  onCreateSuccess={async () => await syncEnvelope()}
                  onDeleteSuccess={async () => await syncEnvelope()}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      title={t(msg`Direct Link`)}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      <Trans>Direct Link</Trans>
                    </Button>
                  }
                />
              )}

              {allowDuplication && (
                <EnvelopeDuplicateDialog
                  envelopeId={envelope.id}
                  envelopeType={envelope.type}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      title={t(msg`Duplicate Envelope`)}
                    >
                      <CopyPlusIcon className="mr-2 h-4 w-4" />
                      {isDocument ? (
                        <Trans>Duplicate Document</Trans>
                      ) : (
                        <Trans>Duplicate Template</Trans>
                      )}
                    </Button>
                  }
                />
              )}

              {allowSaveAsTemplate && isDocument && (
                <EnvelopeSaveAsTemplateDialog
                  envelopeId={envelope.id}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      title={t(msg`Save as Template`)}
                    >
                      <FileOutputIcon className="mr-2 h-4 w-4" />
                      <Trans>Save as Template</Trans>
                    </Button>
                  }
                />
              )}

              {allowDownloadPDF && (
                <EnvelopeDownloadDialog
                  envelopeId={envelope.id}
                  envelopeStatus={envelope.status}
                  envelopeItems={envelope.envelopeItems}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      title={t(msg`Download PDF`)}
                    >
                      <DownloadCloudIcon className="mr-2 h-4 w-4" />
                      <Trans>Download PDF</Trans>
                    </Button>
                  }
                />
              )}

              {allowDeletion && envelope.id && (
                <EnvelopeDeleteDialog
                  id={envelope.id}
                  type={envelope.type}
                  status={envelope.status}
                  title={envelope.title}
                  canManageDocument={true}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      title={t(msg`Delete Envelope`)}
                    >
                      <Trash2Icon className="mr-2 h-4 w-4" />
                      {isDocument ? <Trans>Delete Document</Trans> : <Trans>Delete Template</Trans>}
                    </Button>
                  }
                  onDelete={async () => {
                    await navigate(
                      envelope.type === EnvelopeType.DOCUMENT
                        ? relativePath.documentRootPath
                        : relativePath.templateRootPath,
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20">
          {match({
            pageToRender,
            allowUploadAndRecipientStep,
            allowAddFieldsStep,
            allowPreviewStep,
          })
            .with({ pageToRender: 'loading' }, () => <SpinnerBox className="py-32" />)
            .with({ pageToRender: 'upload', allowUploadAndRecipientStep: true }, () => (
              <EnvelopeEditorUploadPage />
            ))
            .with({ pageToRender: 'addFields', allowAddFieldsStep: true }, () => (
              <EnvelopeEditorFieldsPage />
            ))
            .with({ pageToRender: 'preview', allowPreviewStep: true }, () => (
              <EnvelopeEditorPreviewPage />
            ))
            .otherwise(() => null)}
        </div>
      </div>
    </div>
  );
};
