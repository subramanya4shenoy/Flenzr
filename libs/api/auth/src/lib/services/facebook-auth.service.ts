import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class FBAuthService {
    constructor(private readonly authService:AuthService) {}
    
      /**
   * @param input
   * @returns user Object and token
   * @desc sign up the user with verfified as false,
   * crete the signInActivityDB entry.
   * @pending [send email to verify]
   */
  async signUpWithFb(): Promise<string> {
      return "sign up service"
  }
}