import { NseExpiryService } from './services/nseExpiryService.js';
console.log('NIFTY Expiries:');
console.log(NseExpiryService.getUpcomingExpiries('NIFTY'));
console.log('\nBANKNIFTY Expiries (Wednesdays):');
console.log(NseExpiryService.getUpcomingExpiries('BANKNIFTY'));
console.log('\nFINNIFTY Expiries (Tuesdays):');
console.log(NseExpiryService.getUpcomingExpiries('FINNIFTY'));
console.log('\nMIDCPNIFTY Expiries (Mondays):');
console.log(NseExpiryService.getUpcomingExpiries('MIDCPNIFTY'));
