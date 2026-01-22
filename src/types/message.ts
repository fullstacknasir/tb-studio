export enum Type {
  SUBMIT="submit",
  HOME="home",
  RELOAD="reload",
  LOGOUT="logout",
  WIDGET_BUNDLE="widget-bundle",
  WIDGET_BUNDLE_TYPE="widget-bundle-type",
  WIDGET="widget",
  WIDGET_BUNDLES="widget-bundles",
  ERROR="error",
  WIDGETS="widgets",
  FILE="file",
  HOST="host",
  UPDATE_SETTINGS="update-settings"
}

export type WidgetListItem = { id: string; name: string };
export type WidgetBundleListItem = { id: string; name: string };

export type SubmitMessage = {
type: Type.SUBMIT;
payload: { username: string; password: string, rememberMe: boolean };
};

export type HomeMessage = { type: Type.HOME };
export type ReloadMessage = { type: Type.RELOAD };
export type LogoutMessage = { type: Type.LOGOUT };
export type WidgetBundleMessage = {
type: Type.WIDGET_BUNDLE;
payload: { widget: WidgetBundleListItem };
};
export type OutboundWidgetBundleTypes = { type: Type.WIDGET_BUNDLE_TYPE; payload: { widgets: WidgetListItem[], displayName: string } };
export type Widget = { type: Type.WIDGET; payload: { files: unknown } };
export type InboundMessage =
| SubmitMessage
| ReloadMessage
| LogoutMessage
| WidgetBundleMessage
| OutboundWidgetBundleTypes
| Widget
| HomeMessage
| { type: Type.WIDGET_BUNDLE_TYPE; payload: { widget: WidgetListItem } }
| { type: Type.WIDGET_BUNDLES }
| {type: Type.FILE, payload: { name: string, content: string } }
| {type: Type.HOST, payload: {}}
| {type: Type.UPDATE_SETTINGS};

export type OutboundError = { type: Type.ERROR; message: string };
export type OutboundWidgets = { type: Type.WIDGETS; widgets: WidgetListItem[] };
export type OutboundWidgetBundles = { type: Type.WIDGET_BUNDLES; bundles: WidgetBundleListItem[] };

export type Suggestion = {
  caption?: string;
  snippet?: string;
  value?: string;
  meta?: string;
  docHTML?: string;
};
