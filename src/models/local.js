import { strictFormat } from '../utils/text.js';
const { execSync } = import('child_process');

export class Local {
    constructor(model_name, url) {
        this.model_name = model_name;
        this.url = url || 'http://localhost:8000';
        this.chat_endpoint = '/chat';
        this.embedding_endpoint = '/embed';
    }

    async sendRequest(turns, systemMessage) {
        let model = this.model_name || 'nightwing';
        let messages = [];

        const latestTurn = turns[turns.length - 1];
        if (latestTurn) {
            messages.push({
                role: latestTurn.role,
                content: latestTurn.content
            });
        }
        
        if (systemMessage) {
            messages.unshift({
                role: 'system',
                content: systemMessage
            });
        }
        messages.unshift({role: 'system', content: systemMessage});
        let res = null;

        try {
            console.log(`Awaiting local response... (model: ${model})`)

            const request = {
                messages: messages,
                max_tokens: 100
            };
            
            res = await fetch(`${this.url}${this.chat_endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });

            const result = await res.json();
            
            if (result)
                res = result['reply'];
        }
        catch (err) {
            if (err.message.toLowerCase().includes('context length') && turns.length > 1) {
                console.log('Context length exceeded, trying again with shorter context.');
                return await sendRequest(turns.slice(1), systemMessage, stop_seq);
            } else {
                console.log(err);
                res = 'My brain disconnected, try again.';
            }
        }
        return res;
    }

    async embed(text) {
        let body = JSON.stringify({ text: text });
    
        const response = await fetch(`${this.url}${this.embedding_endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const res = await response.json();
        return [res['embedding']];
    }

    async send(endpoint, body) {
        const url = new URL(endpoint, this.url);
        let method = 'CURL';
        let headers = new Headers();
        const request = new Request(url, {method, headers, body: JSON.stringify(body)});
        let data = null;
        try {
            const res = await fetch(request);
            if (res.ok) {
                data = await res.json();
            } else {
                throw new Error(`Ollama Status: ${res.status}`);
            }
        } catch (err) {
            console.error('Failed to send Ollama request.');
            console.error(err);
        }
        return data;
    }
}