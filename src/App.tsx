/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Video, Key } from 'lucide-react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setApiKeySelected(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    setVideoUrl(null);
    setLoadingMessage('Initializing video generation...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      setLoadingMessage('Generating video (this may take a few minutes)...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio,
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setLoadingMessage('Fetching video...');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.API_KEY!,
          },
        });
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error('Video generation error:', error);
      setLoadingMessage('Error generating video.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Veo Video Generator</h1>
      
      {!apiKeySelected ? (
        <button
          onClick={handleSelectKey}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
        >
          <Key size={20} /> Select API Key
        </button>
      ) : (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt for your video..."
            className="w-full p-4 border rounded-lg"
            rows={4}
          />
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
            className="p-2 border rounded-lg"
          >
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
          </select>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
            className="p-2 border rounded-lg"
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {generating ? <Loader2 className="animate-spin" /> : <Video />}
            Generate Video
          </button>
          
          {generating && <p>{loadingMessage}</p>}
          
          {videoUrl && (
            <video src={videoUrl} controls className="w-full max-w-2xl rounded-lg shadow-lg" />
          )}
        </div>
      )}
    </div>
  );
}
