import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

import {
  IBedrockService,
  ClassificationResult,
  FieldExtractionResult,
} from './bedrock.service.abstract.js';

export type { ClassificationResult, FieldExtractionResult };

@Injectable()
export class BedrockService extends IBedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const region = this.configService.get<string>('aws.region') || 'ap-southeast-1';
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

    const clientConfig: any = {
      region,
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      };
    }

    this.bedrockClient = new BedrockRuntimeClient(clientConfig);
    this.modelId =
      this.configService.get<string>('aws.bedrock.modelId') ||
      'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  /**
   * Classify document text into one of the provided requirement names.
   * @param ocrText The text extracted from the document
   * @param requirementNames Allowed categories
   */
  async classifyDocument(ocrText: string, requirementNames: string[]): Promise<ClassificationResult | null> {
    this.logger.log('Classifying document using Bedrock');
    
    const prompt = `You are an AI document classifier. Based on the following document text, classify it into exactly one of these categories: ${requirementNames.join(', ')}.
    If it does not match any, choose the closest one or return null if completely unrelated.
    
    Document text:
    ${ocrText}
    
    Respond STRICTLY in the following JSON format without any markdown or extra text:
    {
      "requirementName": "Name of the requirement from the list",
      "confidence": (number between 0 and 1 indicating confidence)
    }`;

    try {
      const responseJson = await this._invokeModel(prompt);
      if (responseJson?.requirementName) {
        return {
          requirementName: responseJson.requirementName,
          confidence: responseJson.confidence || 0,
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Error classifying document', error);
      throw error;
    }
  }

  /**
   * Extract specific fields from the document text.
   * @param ocrText The text extracted from the document
   * @param fieldNames The fields to extract
   */
  async extractFields(ocrText: string, fieldNames: string[]): Promise<FieldExtractionResult[]> {
    this.logger.log('Extracting fields using Bedrock');
    
    const prompt = `You are an AI data extractor. Extract the following fields from the document text: ${fieldNames.join(', ')}.
    If a field is not found in the text, its value should be null.
    
    Document text:
    ${ocrText}
    
    Respond STRICTLY in the following JSON format without any markdown or extra text:
    {
      "fields": [
        {
          "fieldName": "Field Name",
          "value": "Extracted value or null",
          "confidence": (number between 0 and 1 indicating confidence)
        }
      ]
    }`;

    try {
      const responseJson = await this._invokeModel(prompt);
      if (responseJson?.fields) {
        return responseJson.fields;
      }
      return [];
    } catch (error) {
      this.logger.error('Error extracting fields', error);
      throw error;
    }
  }

  /**
   * Internal method to invoke Bedrock model and parse JSON.
   */
  private async _invokeModel(prompt: string): Promise<any> {
    // Note: The payload format depends on the specific model family (e.g. Claude vs Titan).
    // Assuming Anthropic Claude format for this implementation given its common use in this context.
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
      ],
      temperature: 0,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = new TextDecoder().decode(response.body);
    const parsedBody = JSON.parse(responseBody);
    
    // Extract JSON from Claude's response text
    const textContent = parsedBody.content?.[0]?.text || '';
    
    // Sometimes LLMs wrap JSON in markdown blocks despite instructions
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(textContent);
  }
}
