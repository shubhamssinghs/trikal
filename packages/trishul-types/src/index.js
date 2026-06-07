"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthScope = exports.OAuthGrantType = exports.OAuthResponseType = exports.OAuthTokenType = void 0;

exports.OAuthScope = {
  OPENID: "openid",
  PROFILE: "profile",
  EMAIL: "email",
  OFFLINE_ACCESS: "offline_access",
  ADDRESS: "address",
  PHONE: "phone",
};

exports.OAuthGrantType = {
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
  CLIENT_CREDENTIALS: "client_credentials",
  IMPLICIT: "implicit",
};

exports.OAuthResponseType = {
  CODE: "code",
  TOKEN: "token",
  ID_TOKEN: "id_token",
};

exports.OAuthTokenType = {
  BEARER: "Bearer",
  DPOP: "DPoP",
};
