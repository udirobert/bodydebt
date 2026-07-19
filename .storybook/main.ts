import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  // Serve public assets in Storybook (mediapipe, ezkl, etc.) but NOT
  // public/storybook/ — that's the previous Storybook build output, and
  // including it here causes recursive nesting (storybook inside storybook
  // inside storybook... 3.6GB and growing on each deploy).
  staticDirs: ["../public/mediapipe", "../public/ezkl"],
};

export default config;
