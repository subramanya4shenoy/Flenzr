import { render, screen, fireEvent } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

import SharedUiFlenzrSignInForm from './shared-ui-flenzr-sign-in-form';

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {
        changeLanguage: () =>
          new Promise(() => {
            return;
          }),
      },
    };
  },
}));
const mockOnSignIn = jest.fn();

describe("Test cases for Flenzr Sign in", () => {
  /** Unit test cases to test the UI Elements */
  describe("Test cases for Flenzr SignIn Form UI", () => {
    it("should render successfully", () => {
      const { baseElement } = render(
        <SharedUiFlenzrSignInForm onSignIn={mockOnSignIn} />
      );
      expect(baseElement).toBeTruthy();
    });

    it("Test for existing minimum feilds", ()=> {
      render(<SharedUiFlenzrSignInForm onSignIn={mockOnSignIn} />);
      const { t } = useTranslation();
      const emailInput = screen.getAllByLabelText(t('emailOrMobile'))
      expect(emailInput).toBeDefined();
      const passwordInput = screen.getAllByLabelText(t('password'))
      expect(passwordInput).toBeDefined();
      const submitButton = screen.getByRole("button", {name: t('loginBtn')})
      expect(submitButton).toBeDefined();
      const forgotPassButton = screen.getByRole("button", {name: t('forgotPassword')})
      expect(forgotPassButton).toBeDefined();
    })



  });

  /** Unit test cases to test the UI Logic */
  describe("Test cases for Brand SignIn Form Login", () => {
    
    it("Test for existing minimum feilds", ()=> {
      render(<SharedUiFlenzrSignInForm onSignIn={mockOnSignIn} />);
      const { t } = useTranslation();
      const submitButton = screen.getByRole("button", {name: t('loginBtn')})
      fireEvent.click(submitButton);
      expect(mockOnSignIn).toHaveBeenCalled();
    })

    it("Test for Inputs on email", async () => {
      render(<SharedUiFlenzrSignInForm onSignIn={mockOnSignIn} />);
      const { t } = useTranslation();
      const emailInputElm = screen.getByLabelText(t('emailOrMobile'))
      fireEvent.change(emailInputElm, {target: {value: "test@kk.co.kk"}})
      const result = await screen.findByDisplayValue("test@kk.co.kk")
      expect(result).toBeDefined();
    })

    it("Test for Inputs on password", async () => {
      render(<SharedUiFlenzrSignInForm onSignIn={mockOnSignIn} />);
      const { t } = useTranslation();
      const passwordInputElm = screen.getByLabelText(t('password'))
      fireEvent.change(passwordInputElm, {target: {value: "1234"}})
      const result = await screen.findByDisplayValue("1234")
      expect(result).toBeDefined();
    })

  });
});
