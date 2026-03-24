#!/usr/bin/env node
/**
 * Clawbot Lite - CLI 入口
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { input } from '@inquirer/prompts';
import { createAgent } from './agent.js';
import type { AgentConfig } from './types.js';

const VERSION = '1.0.0';
const BANNER = `
${chalk.cyan('╔══════════════════════════════════════╗')}
${chalk.cyan('║')}   ${chalk.bold.green('Clawbot Lite')} ${chalk.gray('v' + VERSION)}              ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('AI Agent 学习框架')}                  ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════╝')}
`;

// 配置
function getConfig(): AgentConfig {
  const provider = (process.env.MODEL_PROVIDER || 'anthropic') as 'anthropic' | 'openai';
  const model = process.env.MODEL_NAME || 'claude-sonnet-4-6';
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    console.error(chalk.red('错误: 请在 .env 文件中设置 API Key'));
    console.error(chalk.gray('ANTHROPIC_API_KEY=your_key_here'));
    process.exit(1);
  }

  return {
    llm: {
      provider,
      model,
      apiKey,
      maxTokens: 4096,
      temperature: 0.7,
    },
    systemPrompt: `你是一个有帮助的 AI 助手 Clawbot。你可以使用工具来帮助用户完成任务。
回答问题时请简洁明了，使用中文回答。`,
  };
}

// 交互式聊天
async function startChat(): Promise<void> {
  console.log(BANNER);
  console.log(chalk.gray('输入消息开始对话，输入 /exit 退出\n'));

  const config = getConfig();
  const agent = createAgent(config);
  let spinner: Ora | undefined;

  // 主循环
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const userInput = await input({
      message: chalk.cyan('你'),
      default: '',
    });

    if (!userInput.trim()) {
      continue;
    }

    // 命令处理
    if (userInput.startsWith('/')) {
      const command = userInput.trim().toLowerCase();

      if (command === '/exit' || command === '/quit') {
        console.log(chalk.gray('\n再见! 👋'));
        break;
      }

      if (command === '/clear') {
        agent.clearHistory();
        console.log(chalk.green('✓') + chalk.gray(' 对话历史已清空\n'));
        continue;
      }

      if (command === '/help') {
        console.log(chalk.bold('\n命令列表:'));
        console.log(chalk.cyan('  /exit, /quit') + chalk.gray(' - 退出程序'));
        console.log(chalk.cyan('  /clear') + chalk.gray('       - 清空对话历史'));
        console.log(chalk.cyan('  /help') + chalk.gray('        - 显示帮助\n'));
        continue;
      }

      console.log(chalk.yellow('未知命令，输入 /help 查看帮助\n'));
      continue;
    }

    // 发送消息
    try {
      spinner = ora(chalk.gray('思考中...')).start();
      const response = await agent.chat(userInput);
      spinner?.stop();
      console.log(chalk.green('\nClawbot: ') + response + '\n');
    } catch (error) {
      spinner?.stop();
      console.error(chalk.red('错误: ') + (error instanceof Error ? error.message : '未知错误'));
      console.log();
    }
  }
}

// 单次问答模式
async function askOnce(question: string): Promise<void> {
  const config = getConfig();
  const agent = createAgent(config);

  const spinner = ora(chalk.gray('思考中...')).start();
  try {
    const response = await agent.chat(question);
    spinner.stop();
    console.log(response);
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('错误: ') + (error instanceof Error ? error.message : '未知错误'));
    process.exit(1);
  }
}

// CLI 程序
const program = new Command();

program
  .name('cbl')
  .description('Clawbot Lite - AI Agent 学习框架')
  .version(VERSION, '-v, --version', '显示版本号')
  .argument('[question]', '提问问题（可选，不提供则进入交互模式）')
  .option('-m, --model <model>', '指定模型', 'claude-sonnet-4-6')
  .option('-t, --temperature <temp>', '设置温度', '0.7')
  .action(async (question, options) => {
    if (options.model) {
      process.env.MODEL_NAME = options.model;
    }
    if (options.temperature) {
      process.env.TEMPERATURE = options.temperature;
    }

    if (question) {
      // 单次问答模式
      await askOnce(question);
    } else {
      // 交互模式
      await startChat();
    }
  });

// 添加子命令
program
  .command('config')
  .description('显示当前配置')
  .action(() => {
    console.log(BANNER);
    console.log(chalk.bold('当前配置:'));
    console.log(chalk.cyan('  Provider: ') + (process.env.MODEL_PROVIDER || 'anthropic'));
    console.log(chalk.cyan('  Model: ') + (process.env.MODEL_NAME || 'claude-sonnet-4-6'));
    console.log(chalk.cyan('  API Key: ') + (process.env.ANTHROPIC_API_KEY ? '已设置' : chalk.red('未设置')));
  });

// 启动
program.parse();
