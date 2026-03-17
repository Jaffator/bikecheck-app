import { chromium } from 'playwright-extra';
import { Browser, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

interface BikeData {
  name: string;
  image: string | null;
  url: string;
}
class BikeDataApi {
  private browser: Browser;
  private page: Page;
  constructor() {}

  private async initBrowser(): Promise<void> {
    chromium.use(stealthPlugin());
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    // Protection against bot detection
    await this.page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    });
  }

  async getBikeList(brand: string, model: string, year: string): Promise<BikeData[]> {
    // Starting the browser
    await this.initBrowser();

    const url = `https://99spokes.com/en-EU/bikes?q=${encodeURIComponent(brand)}%20${encodeURIComponent(model)}&year=${encodeURIComponent(year)}`;
    console.log(url);
    try {
      console.log(`Navigation: ${url}...`);
      await this.page.goto(url, { waitUntil: 'networkidle' });
      // Wait for the bike cards selector

      await this.page.waitForSelector('a[href*="/bikes/"]', { timeout: 6000 });
      // Extraction of data using page.evaluate
      const bikes: BikeData[] = await this.page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href*="/bikes/"]'));
        return (
          cards
            .map((card) => {
              const anchor = card as HTMLAnchorElement;
              const nameElement = anchor.querySelector('span');
              const imgElement = anchor.querySelector('img');
              return {
                name: nameElement ? nameElement.innerText.trim() : 'Unknown name',
                image: imgElement ? imgElement.getAttribute('src') : null,
                url: anchor.href,
              };
            })
            // Filter to keep only real bikes with images
            .filter((bike) => bike.image && !bike.image.includes('placeholder'))
        );
      });
      console.log(`Found ${bikes.length} bikes:`);
      return bikes;
    } catch (error) {
      throw new Error(`Error while finding bikes: ${error.message}`);
    } finally {
      await this.browser.close();
    }
  }

  async getBikeInfo(url: string) {
    await this.initBrowser();

    try {
      console.log('Navigating to the page...');
      await this.page.goto(url, { waitUntil: 'load' });

      // Wait for the tables to render
      await this.page.waitForSelector('table');

      // Logic for extracting data
      const data = await this.page.evaluate(() => {
        // Find all tables in the specifications container
        // On 99spokes, tables are often in sections (Components, Geometry, etc.)
        const tables = Array.from(document.querySelectorAll('table'));

        return tables.map((table) => {
          const rows = Array.from(table.querySelectorAll('tr'));
          return rows.map((row) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            return cells.map((cell) => (cell as HTMLElement).innerText.trim());
          });
        });
      });
      return data.reverse();
    } catch (error) {
      throw new Error(`Error when loading bike component data: ${error.message}`);
    } finally {
      await this.browser.close();
    }
  }
}
const bikeDataApi = new BikeDataApi();
bikeDataApi
  .getBikeList('Merida', 'Reacto', '2023')
  .then((bikes) => {
    console.log(bikes);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
