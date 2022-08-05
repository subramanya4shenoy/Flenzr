import { fireEvent, render, screen } from "@testing-library/react";
import "jest-canvas-mock";
import { useTranslation } from "react-i18next";
import FeatureProductPage from "./feature-product-page";

// Mocks used by the components
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
const mockNavigateTo = jest.fn();

describe("Test cases for FeatureProductPage", () => {

  /** Unit test cases to test the UI Elements */
  describe("Test cases for FeatureProductPage UI", () => {
    it("should render FeatureProductPage successfully", async () => {
      const { baseElement } = render(
        <FeatureProductPage navigateTo={mockNavigateTo} />
      );
      expect(baseElement).toBeTruthy();
    });

    /** Logo should be exisiting and its for desktop and mobile = 2 */
    it("should contain flenzr logo", async () => {
      render(<FeatureProductPage navigateTo={mockNavigateTo} />);
      const logos = await screen.findAllByAltText("Flenzr");
      expect(logos).toBeDefined();
      expect(logos.length).toBe(2);
    });

    /** should have signUp Button */
    it("Should have login and sign up buttons", async () => {
      render(<FeatureProductPage navigateTo={mockNavigateTo} />);
      const { t } = useTranslation();
      const signUpBtn = await screen.findByText(t("join"));
      console.log(signUpBtn);
      expect(signUpBtn).toBeDefined();
    });
  });

  /** Unit test cases for testing the logic */
  describe("Test cases for FeatureProductPage business logic", () => {
    it("Should Route emit SignUp", async() => {
      render(<FeatureProductPage navigateTo={mockNavigateTo} />);
      const { t } = useTranslation();
      const signUpBtn = await screen.findByText(t("join"));
      fireEvent.click(signUpBtn);
      expect(mockNavigateTo).toHaveBeenCalledWith("signup")
    })

    it("Should Route emit Signin", async() => {
      render(<FeatureProductPage navigateTo={mockNavigateTo} />);
      const { t } = useTranslation();
      const signUpBtn = await screen.findByText(t("login"));
      fireEvent.click(signUpBtn);
      expect(mockNavigateTo).toHaveBeenCalledWith("signin")
    })
  })
});
