from openai import OpenAI
client = OpenAI()

class WhisperSpeech:
    def speech_to_text(audio_file_path):
        audio_file = open(audio_file_path, "rb")
        # Assuming the OpenAI API can handle audio content directly
        transcript = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
        return " ".join([word['word'] for word in transcript.words])



    # if __name__=="__main__":
    # speech('recorded-audio.m4a')