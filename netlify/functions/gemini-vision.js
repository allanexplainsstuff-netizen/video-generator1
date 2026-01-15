// Server-side Gemini Vision API Handler for Netlify
// This runs on the server, keeping API keys secure

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDCCbCVPtNHZSrJxGKVRJBpEqogCmxC5hY';

exports.handler = async (event, context) => {
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { prompt, imageData, mimeType = 'image/jpeg' } = JSON.parse(event.body);

        // Validate inputs
        if (!prompt || !imageData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: prompt and imageData' })
            };
        }

        // Process the image data
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

        // Prepare Gemini Vision API request
        const payload = {
            contents: [{
                parts: [
                    {
                        text: `Analyze this image and the user's request. Provide a detailed cinematic scene description suitable for video generation.

USER REQUEST: "${prompt}"

RESPONSE FORMAT:
Provide a comprehensive cinematic description including:

1. SCENE ENVIRONMENT: Describe the setting, location, background elements
2. SUBJECT APPEARANCE: Detail what subjects/characters look like, their positioning, expressions
3. CAMERA ANGLE: Specify camera position (wide shot, close-up, aerial, tracking shot, etc.)
4. LIGHTING & MOOD: Describe lighting conditions, atmosphere, emotional tone
5. MOTION DESCRIPTION: Explain how elements should move in the video

Keep it cinematic and professional. Focus on visual elements that can be translated into video.`
                    },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }]
        };

        // Make server-side API call to Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const sceneDescription = data.candidates[0].content.parts[0].text.trim();

        // Return successful response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: true,
                enhancedPrompt: sceneDescription,
                aiSource: 'image-vision'
            })
        };

    } catch (error) {
        console.error('Server-side Gemini error:', error);
        
        // Return error for frontend fallback
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                fallback: true
            })
        };
    }
};