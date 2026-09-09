import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openAITransportModel} from '../prototype/architecture/model-transport.mjs';
test('transport receives catalog id without CLI provider prefix', () => {
  assert.equal(openAITransportModel({provider:'openai',id:'gpt-4o-mini'}),'gpt-4o-mini');
});
test('foreign provider cannot use OpenAI transport', () => {
  assert.throws(() => openAITransportModel({provider:'anthropic',id:'claude'}), /unsupported native provider/);
  assert.throws(() => openAITransportModel({provider:'openai'}), /resolved model id required/);
});
