import type { ThemeConfig } from "antd";

/** Theme Ant Design – phương án F (xanh biển, nền trắng). Đổi màu chủ đạo tại colorPrimary */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: "#0B4DA2",
    colorLink: "#0B4DA2",
    colorSuccess: "#1F8A4C",
    colorError: "#8C1D2F",
    colorBgLayout: "#F3F5F8",
    colorText: "#14213D",
    colorTextSecondary: "#4B5874",
    colorBorderSecondary: "#DCE3EC",
    borderRadius: 8,
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    controlHeight: 38,
  },
  components: {
    Layout: { siderBg: "#FFFFFF", headerBg: "#0B4DA2" },
    Menu: {
      itemSelectedBg: "#EAF1FB",
      itemSelectedColor: "#0B4DA2",
      itemColor: "#4B5874",
    },
    Table: { headerBg: "#F7F9FC" },
  },
};
