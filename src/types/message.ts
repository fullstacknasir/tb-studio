export enum Type {
  SUBMIT="submit",
  HOME="home",
  RELOAD="reload",
  LOGOUT="logout",
  WIDGET_BUNDLE="widget-bundle",
  WIDGET_BUNDLE_TYPE="widget-bundle-type",
  WIDGET="widget",
  ERROR="error",
  WIDGETS="widgets",
  FILE="file",
  HOST="host",
  UPDATE_SETTINGS="update-settings"
}

export type SubmitMessage = {
type: Type.SUBMIT;
payload: { username: string; password: string, rememberMe: boolean };
};

export type HomeMessage = { type: Type.HOME };
export type ReloadMessage = { type: Type.RELOAD };
export type LogoutMessage = { type: Type.LOGOUT };
export type WidgetBundleMessage = {
type: Type.WIDGET_BUNDLE;
payload: { widget: unknown };
};
export type OutboundWidgetBundleTypes = { type: Type.WIDGET_BUNDLE_TYPE; payload: { widgets: unknown, displayName: string } };
export type Widget = { type: Type.WIDGET; payload: { files: any } };
export type InboundMessage =
| SubmitMessage
| ReloadMessage
| LogoutMessage
| WidgetBundleMessage
| OutboundWidgetBundleTypes
| Widget
| HomeMessage
| { type: Type.WIDGET_BUNDLE_TYPE; payload: { widget: any } }
| {type: Type.FILE, payload: { name: string, content: string } }
| {type: Type.HOST, payload: {}}
| {type: Type.UPDATE_SETTINGS};

export type OutboundError = { type: Type.ERROR; message: string };
export type OutboundWidgets = { type: Type.WIDGETS; widgets: Array<{ id: string; name: string }> };

export type Suggestion = {
  caption?: string;
  snippet?: string;
  value?: string;
  meta?: string;
  docHTML?: string;
};