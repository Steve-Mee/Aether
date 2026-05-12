// src/api/routes/command/processCommand.route.ts
import { Router } from 'express';
import { z } from 'zod';
import { ContextProvider } from '../../../ai/context/context-provider';
import { DecisionEngine } from '../../../ai/decision/decision-engine';
import { LLMClient } from '../../../ai/infrastructure/llm-client';
import { CommandResult } from './types';

const router = Router();

const ProcessSchema = z.object({ query: z.string().min(3) });

router.post('/command/process', async (req, res) => {
  try {
    const { query } = ProcessSchema.parse(req.body);
    const merchantId = req.merchant?.id;

    const context = await ContextProvider.getRichContext(merchantId, query);

    const llmResponse = await LLMClient.structuredOutput({
      prompt: `Analyze this merchant command and return structured decision.\nQuery: ${query}\nContext: ${JSON.stringify(context).slice(0,2000)}`,
      schema: { type: 'object', properties: { title: {type:'string'}, description:{type:'string'}, confidence:{type:'number'}, riskLevel:{enum:['low','medium','high']}, actionType:{type:'string'}, payload:{type:'object'}, module:{type:'string'} }, required: ['title','description','confidence','riskLevel','actionType','module'] }
    });

    const decision = await DecisionEngine.createDecision({ merchantId, query, ...llmResponse, proposedAction: { type: llmResponse.actionType, payload: llmResponse.payload } });

    const result: CommandResult = { id: decision.id, type: llmResponse.confidence > 75 ? 'action' : 'insight', title: llmResponse.title, description: llmResponse.description, confidence: llmResponse.confidence, riskLevel: llmResponse.riskLevel, proposedAction: { type: llmResponse.actionType as any, payload: llmResponse.payload }, module: llmResponse.module };

    res.json([result]);
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;