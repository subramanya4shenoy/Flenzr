import { fireEvent, render, screen, within } from "@testing-library/react";
import SharedUiCustomSelect from "./shared-ui-custom-select";

const mockOnChangeSelection = jest.fn();
const handleChanges = (e:any) => { console.log(e)}

describe("SharedUiCustomSelect", () => {
  /** Unit test cases to test the UI */
  describe("Unit test to check the shared custom select component UI", () => {
    it("should render component successfully", () => {
      const list = ["option1", "option2"];
      const selectedOption = "option1";
      const { baseElement } = render(
        <SharedUiCustomSelect
          list={list}
          selectedOption={selectedOption}
          color={"f00"}
          onChangeSelection={mockOnChangeSelection}
        />
      );
      expect(baseElement).toBeTruthy();
    });

    it("Should show the colors successfullt", async () => {
      const list = ["option1", "option2"];
      const selectedOption = "option1";
      render(
        <SharedUiCustomSelect
          list={list}
          selectedOption={selectedOption}
          color={"#f00"}
          onChangeSelection={mockOnChangeSelection}
        />
      );
      const selectedOpt = await screen.findByDisplayValue(selectedOption);
      expect(selectedOpt).toBeDefined();
    });
  });

  /** Unit test cases to test the UI */
  describe("Unit test to check the shared custom select component Logic", () => {

    it("Should send selected option", async () => {
      const list = ["option1", "option2"];
      const selectedOption = "option1";
      const { getByRole } = render(
        <SharedUiCustomSelect
          list={list}
          selectedOption={selectedOption}
          color={"#f00"}
          onChangeSelection={handleChanges}
        />
      );
      fireEvent.mouseDown(getByRole('button'));
      const listbox = within(getByRole('listbox'));
      fireEvent.click(await listbox.getByText("option2"));
      expect(handleChanges).toHaveBeenCalledWith("option2");
    });
  });
});
