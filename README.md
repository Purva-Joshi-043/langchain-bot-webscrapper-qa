# Langchain-bot-webscrapper with LangChain, Pinecone, and OpenAI

This is a sample NestJS application that demonstrates how to use LangChain, Pinecone, and OpenAI to create a Q&A bot that can answer questions by scraping websites and loading relevant information.

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js
- npm
- Pinecone API key
- LangChain API key
- OpenAI API key

---

## Installation

bash
$ npm install


## Pre-Configuration


**package.json**
----------
"generate_embeddings": "ts-node --esm scripts/generate_embeddings.ts"



## Add Environment variables

Please refer [.env.example](./.example.env) for the env variables that is needed

---

## Running the app

bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# staging mode
$ npm run start:staging

# uat mode
$ npm run start:uat

# production mode
$ npm run start:prod