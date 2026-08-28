import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { LABOUR_RATE_LABELS } from './menu/LabourRatesCard';
import { historyPriceLabel } from './sections/HistoryScreen';
import { servicePriceLabel } from './trades/hub/sections/ServicesSection';

describe('point-of-use pricing basis labels', () => {
  it('renders service and labour inputs as ex GST', async () => {
    const screen = await render(
      <View>
        <Text>{servicePriceLabel(125, 'each')}</Text>
        <Text>{LABOUR_RATE_LABELS.hourly}</Text>
        <Text>{LABOUR_RATE_LABELS.callOut}</Text>
      </View>,
    );
    expect(screen.getByText(/A\$125\.00 \/ EACH · EX GST/i)).toBeTruthy();
    expect(screen.getByText('Hourly rate (ex GST)')).toBeTruthy();
    expect(screen.getByText('Call-out minimum (ex GST)')).toBeTruthy();
  });

  it('renders history averages and rows as inc GST', async () => {
    const screen = await render(<Text>{historyPriceLabel(1234)}</Text>);
    expect(screen.getByText(/A\$1,234\.00 inc GST/i)).toBeTruthy();
  });
});
