import { useTranslation } from "react-i18next";
import { TextArea, Icon, IconType } from "@gouvfr-lasuite/ui-components";
import { SectionRow } from "./SectionRow";
import { useFocusOnOpen } from "./useFocusOnOpen";

interface DescriptionSectionProps {
  description: string;
  onChange: (value: string) => void;
  alwaysOpen?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  focusOnOpen?: boolean;
}

export const DescriptionSection = ({
  description,
  onChange,
  alwaysOpen,
  isExpanded,
  onToggle,
  focusOnOpen = false,
}: DescriptionSectionProps) => {
  const { t } = useTranslation();
  const sectionRef = useFocusOnOpen(focusOnOpen);

  return (
    <SectionRow
      ref={sectionRef}
      icon={<Icon name="notes" type={IconType.OUTLINED} aria-hidden />}
      label={t("calendar.event.sections.addDescription")}
      isEmpty={!description}
      alwaysOpen={alwaysOpen}
      isExpanded={isExpanded}
      onToggle={onToggle}
      iconAlign="flex-start"
    >
      <TextArea
        label={t("calendar.event.description")}
        placeholder={t("calendar.event.descriptionPlaceholder")}
        value={description}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        fullWidth
        variant="classic"
        hideLabel
      />
    </SectionRow>
  );
};
