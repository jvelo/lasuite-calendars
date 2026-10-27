/* eslint-disable @typescript-eslint/no-explicit-any */
export class APIError extends Error {
  data?: any;
  code: number;

  constructor(code: number, data?: any) {
    super();
    this.data = data;
    this.code = code;
  }
}
