// Flowbite Modal with the app's dark theme baked in.
//
// The stock Flowbite Modal renders a WHITE box (`content.inner` has
// `bg-white`) and the Modal's `className` prop only styles the outer
// wrapper — so it can never repaint the white box. In this dark-themed
// app the white box makes the theme-aware panel text and outline
// buttons inside it invisible. This wrapper applies the documented
// `theme` prop so every modal follows the app palette.
import { Modal } from "flowbite-react";
import type { CustomFlowbiteTheme, ModalProps } from "flowbite-react";

const themedModal: Partial<CustomFlowbiteTheme["modal"]> = {
  content: {
    inner:
      "relative flex max-h-[90dvh] flex-col rounded-2xl border border-line bg-card shadow-pop",
  },
  header: {
    base: "flex items-start justify-between rounded-t-2xl border-b border-line p-5",
    close: {
      base: "ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-ink-mute transition hover:bg-surface-3 hover:text-ink",
      icon: "h-4 w-4",
    },
  },
  footer: {
    base: "flex items-center space-x-2 rounded-b-2xl border-line p-6",
  },
};

const ThemedModal = (props: ModalProps) => (
  <Modal {...props} theme={themedModal} />
);

export default ThemedModal;
