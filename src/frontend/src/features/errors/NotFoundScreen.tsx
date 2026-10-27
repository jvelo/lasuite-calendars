import { Button, Icon } from "@gouvfr-lasuite/ui-components";
import { useTranslation } from "react-i18next";
import { SimpleLayout } from "@/features/layouts/components/simple/SimpleLayout";
import { GenericDisclaimer } from "@/features/ui/components/generic-disclaimer/GenericDisclaimer";

/** Router fallback for URLs that match no route. */
export const NotFoundScreen = () => {
  const { t } = useTranslation();
  return (
    <SimpleLayout>
      <GenericDisclaimer message={t("404.title")} imageSrc="/403-background.png">
        <Button href="/" icon={<Icon name="home" />}>
          {t("404.button")}
        </Button>
      </GenericDisclaimer>
    </SimpleLayout>
  );
};
