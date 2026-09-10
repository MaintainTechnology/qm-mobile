import { suburbFromAddress } from './address';

it.each([
  ['12 Smith St, Penrith NSW 2750', 'NSW', '2750', 'Penrith'],
  ['12 Smith St, North Sydney NSW 2060', null, null, 'North Sydney'],
  ['12 Smith St', 'NSW', '2750', null],
  ['12 Smith St, NSW 2750', 'NSW', '2750', null],
])('extracts only a usable suburb from %s', (address, state, postcode, expected) => {
  expect(suburbFromAddress(address!, state, postcode)).toBe(expected);
});
