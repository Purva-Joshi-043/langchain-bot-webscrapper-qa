import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PineconeStore } from 'langchain/vectorstores';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { VectorDBQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models';
import { ConfigService } from '@nestjs/config';
import { PineconeClient } from '@pinecone-database/pinecone';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}
  async askQuestion(text: string) {
    console.log('service');
    if (!text) {
      throw new BadRequestException('Missing text');
    }
    if (text.length > 200) {
      throw new BadRequestException('Text too long');
    }

    try {
      const client = new PineconeClient();
      await client.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
      });
      const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get('OPENAI_API_KEY'),
      });

      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
      });

      const model = new ChatOpenAI({
        temperature: 0.9,
        openAIApiKey: this.configService.get('OPENAI_API_KEY'),
        modelName: 'gpt-3.5-turbo',
      });

      const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
        k: 5,
        returnSourceDocuments: true,
      });
      const response = await chain.call({ query: text });
      const { text: responseText, sourceDocuments } = response;

      return {
        text: responseText,
        source: sourceDocuments[0]?.pageContent ?? 'No source document found',
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }
}
