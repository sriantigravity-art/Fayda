import { NseExpiryService } from './services/nseExpiryService.js';

console.log('NIFTY Expiries:');
console.log(NseExpiryService.getUpcomingExpiries('NIFTY'));

console.log('\nSENSEX Expiries (Thursday):');
console.log(NseExpiryService.getUpcomingExpiries('SENSEX'));

console.log('\nRELIANCE Stock Expiries (Monthly Last Tuesday):');
console.log(NseExpiryService.getUpcomingExpiries('RELIANCE'));

console.log('\nCRUDEOIL Expiries (MCX 19th):');
console.log(NseExpiryService.getUpcomingExpiries('CRUDEOIL'));

console.log('\nGOLD Expiries (MCX 5th Bi-monthly):');
console.log(NseExpiryService.getUpcomingExpiries('GOLD'));

console.log('\nNATURALGAS Expiries (MCX 25th):');
console.log(NseExpiryService.getUpcomingExpiries('NATURALGAS'));

