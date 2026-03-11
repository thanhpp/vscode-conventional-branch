import * as vscode from "vscode";
import {
  DEFAULT_FORMAT,
  DEFAULT_TYPES,
  DEFAULT_SCOPES,
  DEFAULT_SERVICES,
  DEFAULT_DESCRIPTION_SEPARATOR,
  DEFAULT_MAX_LENGTH,
} from "./defaults";

export interface ExtensionConfig {
  format: string;
  user: string;
  types: string[];
  scopes: string[];
  services: string[];
  scopeRequired: boolean;
  descriptionSeparator: string;
  lowercaseOnly: boolean;
  maxLength: number;
  autoPush: boolean;
  baseBranch: string;
}

/**
 * Reads and returns the current extension configuration from VSCode settings.
 */
export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration("conventionalBranch");

  return {
    format: config.get<string>("format", DEFAULT_FORMAT),
    user: config.get<string>("user", ""),
    types: config.get<string[]>("types", DEFAULT_TYPES),
    scopes: config.get<string[]>("scopes", DEFAULT_SCOPES),
    services: config.get<string[]>("services", DEFAULT_SERVICES),
    scopeRequired: config.get<boolean>("scopeRequired", false),
    descriptionSeparator: config.get<string>(
      "descriptionSeparator",
      DEFAULT_DESCRIPTION_SEPARATOR,
    ),
    lowercaseOnly: config.get<boolean>("lowercaseOnly", true),
    maxLength: config.get<number>("maxLength", DEFAULT_MAX_LENGTH),
    autoPush: config.get<boolean>("autoPush", false),
    baseBranch: config.get<string>("baseBranch", ""),
  };
}
