/**
 * ImportEventsModal component.
 * Allows users to import events from an ICS file into a calendar.
 */

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Modal,
  ModalSize,
  VariantType,
  Spinner,
} from "@gouvfr-lasuite/ui-components";
import { useImportEvents } from "../../hooks/useCalendars";
import {
  CircleCheck,
  Copy,
  ErrorFilled,
  Upload,
  Warning,
} from "@gouvfr-lasuite/ui-components/icons";

import type { ImportEventsResult } from "../../api";

// Same limit as the backend.
const MAX_FILE_SIZE_MB = 10;

interface ImportEventsModalProps {
  isOpen: boolean;
  caldavPath: string;
  calendarName: string;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const ImportEventsModal = ({
  isOpen,
  caldavPath,
  calendarName,
  onClose,
  onImportSuccess,
}: ImportEventsModalProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportEventsResult | null>(null);
  const importMutation = useImportEvents();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
    importMutation.reset();
    // Lets the user pick the same file again after they fix it.
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const importResult = await importMutation.mutateAsync({
      caldavPath,
      file: selectedFile,
    });
    setResult(importResult);
    if (importResult.imported_count > 0) {
      onImportSuccess?.();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    importMutation.reset();
    onClose();
  };

  const isFileTooLarge = !!selectedFile && selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024;
  const hasErrors = result && result.errors && result.errors.length > 0;
  const hasFailed = importMutation.isError || !!result?.error_code;
  // A failed import keeps the file picker, so the user can try another file.
  const hasResult = result !== null && !hasFailed;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={ModalSize.MEDIUM}
      title={t("calendar.importEvents.title")}
      rightActions={
        hasResult ? (
          <Button color="brand" onClick={handleClose}>
            {t("calendar.subscription.close")}
          </Button>
        ) : (
          <>
            <Button color="neutral" onClick={handleClose}>
              {t("calendar.event.cancel")}
            </Button>
            <Button
              color="brand"
              onClick={handleImport}
              disabled={!selectedFile || isFileTooLarge || importMutation.isPending}
            >
              {importMutation.isPending ? <Spinner size="sm" /> : t("calendar.importEvents.import")}
            </Button>
          </>
        )
      }
    >
      <div className="import-events-modal">
        <p className="import-events-modal__description">
          {t("calendar.importEvents.description", { name: calendarName })}
        </p>

        {!hasResult && (
          <div className="import-events-modal__file-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,.ical,.ifb,.icalendar,text/calendar"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <Button color="neutral" onClick={() => fileInputRef.current?.click()} icon={<Upload />}>
              {t("calendar.importEvents.selectFile")}
            </Button>
            {selectedFile && (
              <span className="import-events-modal__filename">{selectedFile.name}</span>
            )}
          </div>
        )}

        {isFileTooLarge && !hasResult && (
          <Alert className="app__alert--small" type={VariantType.ERROR} icon={<ErrorFilled />}>
            {t("calendar.importEvents.fileTooLarge", { max: MAX_FILE_SIZE_MB })}
          </Alert>
        )}

        {hasFailed && (
          <Alert className="app__alert--small" type={VariantType.ERROR} icon={<ErrorFilled />}>
            {t(
              result?.error_code === "invalid_file"
                ? "calendar.importEvents.invalidFile"
                : "calendar.importEvents.error",
            )}
          </Alert>
        )}

        {hasResult && (
          <div className="import-events-modal__result">
            <p className="import-events-modal__result-header">
              {t("calendar.importEvents.resultHeader")}
            </p>
            <ul className="import-events-modal__stats">
              {result.imported_count > 0 && (
                <li className="import-events-modal__stat import-events-modal__stat--success">
                  <CircleCheck />
                  <span>
                    <strong>{result.imported_count}</strong>{" "}
                    {t("calendar.importEvents.imported", { count: result.imported_count })}
                  </span>
                </li>
              )}
              {result.duplicate_count > 0 && (
                <li className="import-events-modal__stat import-events-modal__stat--neutral">
                  <Copy />
                  <span>
                    <strong>{result.duplicate_count}</strong>{" "}
                    {t("calendar.importEvents.duplicates", { count: result.duplicate_count })}
                  </span>
                </li>
              )}
              {result.skipped_count > 0 && (
                <li className="import-events-modal__stat import-events-modal__stat--warning">
                  <Warning />
                  <span>
                    <strong>{result.skipped_count}</strong>{" "}
                    {t("calendar.importEvents.skipped", { count: result.skipped_count })}
                  </span>
                </li>
              )}
            </ul>
            {hasErrors && (
              <details className="import-events-modal__errors">
                <summary>{t("calendar.importEvents.errorDetails")}</summary>
                <ul>
                  {result.errors!.map((error, index) => (
                    <li key={index}>{error || t("calendar.importEvents.unnamedEvent")}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
