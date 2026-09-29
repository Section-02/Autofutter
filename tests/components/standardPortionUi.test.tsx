import { fireEvent, render } from '@testing-library/react-native';

import { FoodForm, type FoodFormInitialValues } from '../../src/components/food/FoodForm';
import { PreferredAmountInput } from '../../src/components/measurements/PreferredAmountInput';

const formValues: FoodFormInitialValues = {
  name: 'Kodiak Cake',
  referenceWeightG: 63,
  calories: 220,
  proteinG: 15,
  fatG: 2.5,
  carbsG: 37,
  sodiumMg: 450,
  cholesterolMg: 10,
  standardPortionLabel: '',
  standardPortionWeightG: 28,
};

describe('standard portion UI', () => {
  it('makes a saved standard portion visible and converts it to grams when logging', () => {
    const onChangeGrams = jest.fn();
    const screen = render(
      <PreferredAmountInput
        accessibilityLabel="Amount"
        inputStyle={{}}
        measurementSystem="grams"
        onChangeGrams={onChangeGrams}
        portions={[]}
        showStandardPortionChoice
        standardPortion={{ label: 'cake', weightG: 28 }}
        valueG=""
      />,
    );

    expect(screen.getByText('CAKE')).toBeTruthy();
    expect(screen.getByText('1 cake = 28 g')).toBeTruthy();

    fireEvent.press(screen.getByText('CAKE'));
    expect(onChangeGrams).toHaveBeenLastCalledWith('28');
    fireEvent.changeText(screen.getByLabelText('Amount'), '2');
    expect(onChangeGrams).toHaveBeenLastCalledWith('56');
  });

  it('blocks an incomplete standard portion before sending the form to the save handler', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <FoodForm initialValues={formValues} onSubmit={onSubmit} submitLabel="SAVE FOOD" />,
    );

    fireEvent.press(screen.getByText('SAVE FOOD'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter both a standard portion name and its gram weight, or leave both blank.')).toBeTruthy();
  });
});
