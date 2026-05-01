export interface ILoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface ISignupResponse extends ILoginResponse {
  username: string;
  _id: string;
}
