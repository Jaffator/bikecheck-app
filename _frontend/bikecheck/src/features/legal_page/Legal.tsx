// The terms and the privacy policy. The registration checkbox points here before there is
// a session, so the route sits outside the authentication gate - and outside AppLayout
// with it, which is why the page draws its own back header.
import type { ReactElement } from "react";
import { ActionIcon, Box, Group, Stack, Text } from "@mantine/core";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { LEGAL_TITLE_KEYS, isLegalDocumentId, legalDocument } from "@/features/legal/legal.documents";
import { LegalDocument } from "@/features/legal/ui/LegalDocument";

export function Legal(): ReactElement {
  const { document: documentId } = useParams<{ document: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // A direct entry - a share, a deep link - has no history to walk back into.
  function goBack(): void {
    if (location.key === "default") {
      navigate("/");
      return;
    }
    navigate(-1);
  }

  // This page owns the viewport, so it also owns the hardware back gesture.
  useAndroidBackButton(goBack);

  // The parameter is whatever the address holds.
  if (!isLegalDocumentId(documentId)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box mih="100dvh" bg="background.9">
      <Box
        className="bg-background-800"
        px="md"
        style={{
          borderBottom: "1px solid var(--mantine-color-other-borderSubtle)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          height: "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
          paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
        }}
      >
        <Group h="100%" gap="xs" wrap="nowrap">
          <ActionIcon variant="transparent" radius="xl" size="lg" aria-label={t("action.back")} onClick={goBack}>
            <ArrowLeft size={25} color="var(--mantine-color-text-6)" />
          </ActionIcon>
          <Text fw={700} size="lg" c="text.6">
            {t(LEGAL_TITLE_KEYS[documentId])}
          </Text>
        </Group>
      </Box>

      <Stack px="md" pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
        {/* The language follows i18n, so switching it in Settings switches the document. */}
        <LegalDocument blocks={legalDocument(documentId, i18n.language)} />
      </Stack>
    </Box>
  );
}
