export class AuthResponseDto {
  access_token: string;
  refresh_token?: string;
  user: {
    id: number;
    username: string;
    name: string;
    surname: string;
    email?: string;
    is_admin: boolean;
    is_organizer: boolean;
  };
}
