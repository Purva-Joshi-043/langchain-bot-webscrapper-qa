import puppeteer, { Browser } from 'puppeteer';

import TurndownService from 'turndown';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { MarkdownTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';

import { PineconeClient } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import { urls } from './urls';
config();

const turndownService = new TurndownService();

async function main() {
  console.log('main');
  const markdowns = await scrape_all_pages();
  await generate_embeddings(markdowns.join('\n\n'));
}

main();

/**
 * Scrapes all research pages and saves them to a file
 *
 * @returns the markdowns of all researchr pages
 *
 */
async function scrape_all_pages(): Promise<string[]> {
  // get urls from json file
  console.log(`Got ${urls.length} urls ready to scrape`);

  const browser = await puppeteer.launch();
  const markdowns: string[] = [];
  for (const url of urls) {
    try {
      const markdown = await scrape_researchr_page(url, browser);
      console.log(markdown);
      markdowns.push(markdown);
    } catch (e) {
      console.log(e)
      console.log(`Error scraping ${url}`);
    }
  }
  await browser.close();

  console.log(`Got ${markdowns.length} markdowns ready to save`);

  // save all markdowns to a file in the generated folder. If the folder does not exist, create it
  try {
    await readdir('./generated');
  } catch (e) {
    await mkdir('./generated');
  }
  await writeFile('./generated/all.txt', markdowns.join('\n\n'));
  console.log(`Saved all markdowns to ./generated/all.txt`);

  return markdowns;
}

/**
 * Generates embeddings for the given markdowns and saves them to a pinecone index
 * @param markdowns the markdowns to generate embeddings for
 *
 */
async function generate_embeddings(markdowns: string) {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
  const textSplitter = new MarkdownTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 20,
  });
  const embeddings = await textSplitter.splitText(markdowns);
  console.log(`Got ${embeddings.length} embeddings ready to save`);

  const embeddingModel = new OpenAIEmbeddings({
    maxConcurrency: 5,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  await PineconeStore.fromTexts(embeddings, [], embeddingModel, {
    pineconeIndex,
  });
  console.log(`Saved embeddings to pinecone index ${pineconeIndex}`);
}

/**
 * Scrapes the researchr page and returns the markdown
 *
 * @param url the url of the researchr page
 * @param browser the puppeteer browser
 * @returns the markdown of the researchr page
 */
async function scrape_researchr_page(
  url: string,
  browser: Browser,
): Promise<string> {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.goto(url);

  const element = await page.waitForSelector('#content > div.row > div', {
    timeout: 100,
  });

  if (!element) {
    throw new Error('Could not find element');
  }

  // keep only content elements (like p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, code, table, dl, div)
  await element.evaluate((element) => {
    const elements = element.querySelectorAll(
      '*:not(p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, code, table, dl, div)',
    );
    for (let i = 0; i < elements.length; i++) {
      elements[i].parentNode?.removeChild(elements[i]);
    }
  });

  const html_of_element = await element.evaluate(
    (element) => element.innerHTML,
  );

  return turndownService.turndown(html_of_element);
}
