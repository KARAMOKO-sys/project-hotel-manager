import {
  KeywordIntentEngine,
  LOW_CONFIDENCE_THRESHOLD,
  normalizeText,
} from './keyword-intent.engine';
import { ChatbotLanguage } from '../schemas/chatbot-conversation.entity';
import { ChatbotIntent } from '../../chatbot-message/schemas/chatbot-message.entity';

describe('KeywordIntentEngine', () => {
  const engine = new KeywordIntentEngine();

  it('should normalize accents and case', () => {
    expect(normalizeText('  Réveil  À 7H ')).toBe('reveil a 7h');
  });

  it.each([
    ['À quelle heure est le check-out ?', ChatbotIntent.CHECK_OUT_TIME],
    ['What time is check-in?', ChatbotIntent.CHECK_IN_TIME],
    ['Quel est le mot de passe du wifi ?', ChatbotIntent.WIFI],
    ['I need more towels please', ChatbotIntent.TOWELS],
    ['Pouvez-vous me réveiller à 6h30 ?', ChatbotIntent.WAKE_UP_CALL],
    ['Le petit-déjeuner est servi à quelle heure ?', ChatbotIntent.RESTAURANT],
    ['Can I get my invoice?', ChatbotIntent.BILLING],
    ['Je veux parler à un conseiller', ChatbotIntent.HUMAN_AGENT],
    ['La climatisation ne fonctionne pas', ChatbotIntent.COMPLAINT],
  ])('should detect intent of "%s"', (text, intent) => {
    const result = engine.analyze(text);
    expect(result.intent).toBe(intent);
    expect(result.confidence).toBeGreaterThanOrEqual(LOW_CONFIDENCE_THRESHOLD);
  });

  it('should ignore greetings when a business intent is present', () => {
    expect(engine.analyze('Bonjour, le wifi svp').intent).toBe(
      ChatbotIntent.WIFI,
    );
  });

  it('should keep greeting when it is the only intent', () => {
    expect(engine.analyze('Bonjour !').intent).toBe(ChatbotIntent.GREETING);
  });

  it('should return unknown with zero confidence', () => {
    const result = engine.analyze('Quelle est la couleur du ciel ?');
    expect(result.intent).toBe(ChatbotIntent.UNKNOWN);
    expect(result.confidence).toBe(0);
    expect(result.matched_keywords).toEqual([]);
  });

  it('should lower confidence on ambiguous messages', () => {
    const result = engine.analyze('wifi and parking');
    expect(result.confidence).toBeLessThan(LOW_CONFIDENCE_THRESHOLD);
  });

  it('should not match keywords inside other words', () => {
    // « hi » ne doit pas être trouvé dans « this »
    expect(engine.analyze('this').intent).toBe(ChatbotIntent.UNKNOWN);
  });

  it('should flag service requests', () => {
    expect(engine.analyze('2 serviettes svp').is_service_request).toBe(true);
    expect(engine.analyze('wifi ?').is_service_request).toBe(false);
  });

  it('should detect language', () => {
    expect(
      engine.detectLanguage(normalizeText('Je voudrais une chambre')),
    ).toBe(ChatbotLanguage.FR);
    expect(engine.detectLanguage(normalizeText('What time is it please'))).toBe(
      ChatbotLanguage.EN,
    );
    expect(engine.detectLanguage('wifi')).toBeNull();
  });

  describe('extractEntities', () => {
    it('should extract a French time, relative date and room', () => {
      expect(
        engine.extractEntities(
          normalizeText('Réveil demain à 7h30 chambre 204'),
        ),
      ).toEqual({ time: '07:30', date: 'tomorrow', room_number: '204' });
    });

    it('should extract am/pm time', () => {
      expect(engine.extractEntities('wake me at 6pm today')).toEqual({
        time: '18:00',
        date: 'today',
      });
    });

    it('should extract quantities in digits and words', () => {
      expect(engine.extractEntities('3 towels').quantity).toBe(3);
      expect(engine.extractEntities('deux serviettes').quantity).toBe(2);
    });

    it('should extract dd/mm/yyyy dates as ISO', () => {
      expect(engine.extractEntities('le 5/11/2026').date).toBe('2026-11-05');
    });

    it('should ignore invalid times', () => {
      expect(engine.extractEntities('a 25h').time).toBeUndefined();
    });

    it('should return no entities for plain text', () => {
      expect(engine.extractEntities('bonjour')).toEqual({});
    });
  });

  describe('buildAnswer', () => {
    it('should use property context in FAQ answers', () => {
      expect(
        engine.buildAnswer(
          ChatbotIntent.CHECK_IN_TIME,
          ChatbotLanguage.FR,
          {},
          {
            check_in_time: '15:00',
          },
        ),
      ).toContain('15:00');
    });

    it('should use defaults when context is missing', () => {
      expect(
        engine.buildAnswer(ChatbotIntent.CHECK_OUT_TIME, ChatbotLanguage.EN),
      ).toContain('12:00');
    });

    it('should confirm a wake-up call with time and ask otherwise', () => {
      expect(
        engine.buildAnswer(ChatbotIntent.WAKE_UP_CALL, ChatbotLanguage.FR, {
          time: '07:00',
          date: 'tomorrow',
        }),
      ).toBe('Votre réveil est programmé à 07:00 demain.');
      expect(
        engine.buildAnswer(ChatbotIntent.WAKE_UP_CALL, ChatbotLanguage.EN),
      ).toContain('What time');
    });

    it('should return null for intents without template', () => {
      expect(
        engine.buildAnswer(ChatbotIntent.UNKNOWN, ChatbotLanguage.FR),
      ).toBeNull();
    });
  });

  it('should exclude the current intent from suggested replies', () => {
    const replies = engine.suggestedReplies(
      ChatbotLanguage.EN,
      ChatbotIntent.WIFI,
    );
    expect(replies.some((r) => r.includes('Wi-Fi'))).toBe(false);
    expect(replies.length).toBeGreaterThan(0);
  });
});
