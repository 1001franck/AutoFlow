import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { T, Lang, Tr } from '../i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: Tr;
}

const LanguageContext = createContext<LangCtx>({
  lang: 'fr',
  setLang: async () => {},
  t: T.fr,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    AsyncStorage.getItem('lang').then((v) => {
      if (v === 'en') setLangState('en');
    });
  }, []);

  const setLang = async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
