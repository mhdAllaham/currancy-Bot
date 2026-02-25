const axios = require('axios');

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

// Fetches the latest rates against USD
async function getRates() {
    try {
        const response = await axios.get(`${BASE_URL}/usd.json`);
        return response.data.usd;
    } catch (error) {
        console.error('Error fetching rates:', error.message);
        return null;
    }
}

/**
 * Calculates the price of a list of target currencies/metals in the user's base currency.
 * @param {string} baseCurrency - e.g. 'sar', 'egp', 'usd'
 * @param {Array<string>} targets - e.g. ['usd', 'eur', 'gbp', 'xau', 'xag']
 * @returns {Record<string, number>}
 */
async function getPricesInBase(baseCurrency, targets) {
    const usdRates = await getRates();
    if (!usdRates) return null;

    const baseRateFromUsd = usdRates[baseCurrency.toLowerCase()];
    if (!baseRateFromUsd) return null;

    const prices = {};

    targets.forEach(target => {
        const targetRateFromUsd = usdRates[target.toLowerCase()];
        if (targetRateFromUsd) {
            // How much of target is 1 USD? -> targetRateFromUsd
            // Value of target in USD = 1 / targetRateFromUsd
            // Value of target in baseCurrency = (1 / targetRateFromUsd) * baseRateFromUsd
            
            // Except if target is exactly the base currency, it would be exactly 1
            let price = (1 / targetRateFromUsd) * baseRateFromUsd;
            
            // Prices are per 1 unit. XAU and XAG are typically per Troy Ounce based on this API.
            prices[target.toUpperCase()] = price;
        }
    });

    return prices;
}

module.exports = {
    getRates,
    getPricesInBase
};
