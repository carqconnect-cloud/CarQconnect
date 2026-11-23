import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../globals.dart';

/// Extension for fast inline translation: 'Home'.tr
extension TrStringExtension on String {
  String get tr => LocalizationService.translate(this);
}

class LocalizationService {
  static const String prefTitleKey = 'app_selected_language';
  static const String prefCodeKey = 'app_selected_language_code';

  static final ValueNotifier<String> currentLanguageNotifier =
      ValueNotifier<String>('English (India)');

  static final ValueNotifier<String> currentCodeNotifier =
      ValueNotifier<String>('en_IN');

  static String get currentCode => currentCodeNotifier.value;
  static String get currentLanguage => currentLanguageNotifier.value;

  /// Initialize from SharedPreferences
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedTitle = prefs.getString(prefTitleKey);
      final savedCode = prefs.getString(prefCodeKey);

      if (savedTitle != null && savedTitle.isNotEmpty) {
        currentLanguageNotifier.value = savedTitle;
        Globals.selectedLanguage = savedTitle;
      }
      if (savedCode != null && savedCode.isNotEmpty) {
        currentCodeNotifier.value = savedCode;
        Globals.selectedLanguageCode = savedCode;
      }
    } catch (_) {}
  }

  /// Change language across the entire application
  static Future<void> setLanguage(String title, String code) async {
    currentLanguageNotifier.value = title;
    currentCodeNotifier.value = code;
    Globals.selectedLanguage = title;
    Globals.selectedLanguageCode = code;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(prefTitleKey, title);
      await prefs.setString(prefCodeKey, code);
    } catch (_) {}
  }

  /// Translate a string based on current code
  static String translate(String key) {
    final code = currentCode;
    if (code == 'en_IN' || code.startsWith('en')) {
      return key;
    }

    final langMap = _localizedValues[code];
    if (langMap != null && langMap.containsKey(key)) {
      return langMap[key]!;
    }

    return key;
  }

  // Comprehensive multi-language dictionaries
  static final Map<String, Map<String, String>> _localizedValues = {
    // -------------------------------------------------------------
    // HINDI (hi_IN)
    // -------------------------------------------------------------
    'hi_IN': {
      // Bottom Navigation
      'Home': 'होम',
      'Garage': 'गैराज',
      'Products': 'उत्पाद',
      'Profile': 'प्रोफ़ाइल',
      'Account': 'खाता',
      'SOS': 'एसओएस',

      // Language Screen
      'Language': 'भाषा',
      'Select preferred language': 'पसंदीदा भाषा चुनें',
      'Select your preferred language': 'अपनी पसंदीदा भाषा चुनें',
      'Search language (e.g. Hindi, English)...': 'भाषा खोजें (उदा. हिंदी, अंग्रेज़ी)...',
      'No language found for': 'के लिए कोई भाषा नहीं मिली',
      'Apply': 'लागू करें',
      'Save & Apply': 'सहेजें और लागू करें',
      'Language updated to': 'भाषा बदल दी गई है',

      // Account Screen Sections
      'Account Settings': 'खाता सेटिंग्स',
      'Support & Legal': 'सहायता और कानूनी',
      'Profile Completion': 'प्रोफ़ाइल पूर्णता',
      'Edit Profile': 'प्रोफ़ाइल संपादित करें',
      'Personal Information': 'व्यक्तिगत जानकारी',
      'My Vehicles': 'मेरे वाहन',
      'View and manage your registered cars': 'अपने पंजीकृत वाहनों को देखें और प्रबंधित करें',
      'Saved Addresses': 'सहेजे गए पते',
      'Delivery and emergency addresses': 'डिलीवरी और आपातकालीन पते',
      'Emergency Contacts': 'आपातकालीन संपर्क',
      'Family and medical contacts': 'परिवार और चिकित्सा संपर्क',
      'Notification Settings': 'सूचना सेटिंग्स',
      'Push notifications, alerts & silent hours': 'पुश सूचनाएं, अलर्ट और शांत समय',
      'Help & Support': 'सहायता और समर्थन',
      'FAQs, guide & support tickets': 'अक्सर पूछे जाने वाले प्रश्न और सहायता टिकट',
      'Order History': 'ऑर्डर इतिहास',
      'View past orders and tracking': 'पिछले ऑर्डर और ट्रैकिंग देखें',
      'Membership': 'सदस्यता',
      'View benefits and renew plan': 'लाभ देखें और योजना नवीनीकृत करें',
      'About CarQConnect': 'CarQConnect के बारे में',
      'App version, build and company info': 'ऐप संस्करण, बिल्ड और कंपनी की जानकारी',
      'Privacy Policy': 'गोपनीयता नीति',
      'How we handle your data': 'हम आपका डेटा कैसे सुरक्षित रखते हैं',
      'Terms of Service': 'सेवा की शर्तें',
      'Rules and regulations': 'नियम और विनियम',
      'Log Out': 'लॉग आउट',
      'Sign out of your account': 'अपने खाते से साइन आउट करें',
      'Are you sure you want to log out?': 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
      'Cancel': 'रद्द करें',

      // Home Screen
      'Quick Actions': 'त्वरित कार्य',
      'Start Trip': 'यात्रा शुरू करें',
      'Track Vehicle': 'वाहन ट्रैक करें',
      'Battery': 'बैटरी',
      'Fuel': 'ईंधन',
      'Emergency SOS': 'आपातकालीन एसओएस',
      'Service Due': 'सर्विस बाकी है',
      'Total Trips': 'कुल यात्राएं',
      'Distance Travelled': 'तय की गई दूरी',
      'Add Vehicle': 'वाहन जोड़ें',
      'Live Location': 'लाइव स्थान',
      'Good Condition': 'अच्छी स्थिति',
      'Search products...': 'उत्पाद खोजें...',
      'Cart': 'कार्ट',
      'Wishlist': 'इच्छा सूची',
      'Buy Now': 'अभी खरीदें',
      'Price': 'मूल्य',
    },

    // -------------------------------------------------------------
    // MARATHI (mr_IN)
    // -------------------------------------------------------------
    'mr_IN': {
      'Home': 'होम',
      'Garage': 'गॅरेज',
      'Products': 'उत्पादने',
      'Profile': 'प्रोफाइल',
      'Account': 'खाते',
      'SOS': 'एसओएस',

      'Language': 'भाषा',
      'Select preferred language': 'पसंतीची भाषा निवडा',
      'Select your preferred language': 'आपली पसंतीची भाषा निवडा',
      'Search language (e.g. Hindi, English)...': 'भाषा शोधा (उदा. मराठी, इंग्रजी)...',
      'No language found for': 'यासाठी भाषा आढळली नाही',
      'Apply': 'लागू करा',
      'Save & Apply': 'जतन करा आणि लागू करा',
      'Language updated to': 'भाषा बदलली आहे',

      'Account Settings': 'खाते सेटिंग्ज',
      'Support & Legal': 'मदत आणि कायदेशीर',
      'Profile Completion': 'प्रोफाइल पूर्णता',
      'Edit Profile': 'प्रोफाइल संपादित करा',
      'Personal Information': 'वैयक्तिक माहिती',
      'My Vehicles': 'माझी वाहने',
      'View and manage your registered cars': 'नोंदणीकृत वाहने पहा आणि व्यवस्थापित करा',
      'Saved Addresses': 'जतन केलेले पत्ते',
      'Delivery and emergency addresses': 'डिलिव्हरी आणि आपत्कालीन पत्ते',
      'Emergency Contacts': 'आपत्कालीन संपर्क',
      'Family and medical contacts': 'कुटुंब आणि वैद्यकीय संपर्क',
      'Notification Settings': 'सूचना सेटिंग्ज',
      'Push notifications, alerts & silent hours': 'पुश सूचना, अलर्ट आणि शांत तास',
      'Help & Support': 'मदत आणि समर्थन',
      'FAQs, guide & support tickets': 'नेहमी विचारले जाणारे प्रश्न आणि तिकीट',
      'Order History': 'ऑर्डर इतिहास',
      'View past orders and tracking': 'मागील ऑर्डर आणि ट्रॅकिंग पहा',
      'Membership': 'सदस्यत्व',
      'View benefits and renew plan': 'फायदे पहा आणि प्लॅन नूतनीकरण करा',
      'About CarQConnect': 'CarQConnect बद्दल',
      'App version, build and company info': 'अ‍ॅप आवृत्ती, बिल्ड आणि कंपनी माहिती',
      'Privacy Policy': 'गोपनीयता धोरण',
      'How we handle your data': 'आम्ही तुमचा डेटा कसा हाताळतो',
      'Terms of Service': 'सेवा अटी',
      'Rules and regulations': 'नियम आणि कायदे',
      'Log Out': 'लॉग आउट',
      'Sign out of your account': 'आपल्या खात्यातून साइन आउट करा',
      'Are you sure you want to log out?': 'तुम्हाला नक्की लॉग आउट करायचे आहे का?',
      'Cancel': 'रद्द करा',

      'Quick Actions': 'द्रुत कृती',
      'Start Trip': 'प्रवास सुरू करा',
      'Track Vehicle': 'वाहन ट्रॅक करा',
      'Battery': 'बॅटरी',
      'Fuel': 'इंधन',
      'Emergency SOS': 'आपत्कालीन एसओएस',
      'Service Due': 'सर्व्हिस शिल्लक',
      'Total Trips': 'एकूण सहली',
      'Distance Travelled': 'कापलेले अंतर',
      'Add Vehicle': 'वाहन जोडा',
      'Live Location': 'थेट स्थान',
    },

    // -------------------------------------------------------------
    // GUJARATI (gu_IN)
    // -------------------------------------------------------------
    'gu_IN': {
      'Home': 'હોમ',
      'Garage': 'ગેરેજ',
      'Products': 'પ્રોડક્ટ્સ',
      'Profile': 'પ્રોફાઇલ',
      'Account': 'ખાતું',
      'SOS': 'એસઓએસ',

      'Language': 'ભાષા',
      'Select preferred language': 'પસંદગીની ભાષા પસંદ કરો',
      'Select your preferred language': 'તમારી પસંદગીની ભાષા પસંદ કરો',
      'Search language (e.g. Hindi, English)...': 'ભાષા શોધો (દા.ત. ગુજરાતી, અંગ્રેજી)...',
      'No language found for': 'માટે ભાષા મળી નથી',
      'Apply': 'લાગુ કરો',
      'Save & Apply': 'સાચવો અને લાગુ કરો',
      'Language updated to': 'ભાષા અપડેટ થઈ ગઈ',

      'Account Settings': 'એકાઉન્ટ સેટિંગ્સ',
      'Support & Legal': 'સપોર્ટ અને કાનૂની',
      'Profile Completion': 'પ્રોફાઇલ પૂર્ણતા',
      'Edit Profile': 'પ્રોફાઇલ સંપાદિત કરો',
      'Personal Information': 'વ્યક્તિગત માહિતી',
      'My Vehicles': 'મારા વાહનો',
      'View and manage your registered cars': 'તમારી નોંધાયેલી કાર જુઓ અને સંચાલિત કરો',
      'Saved Addresses': 'સાચવેલા સરનામાં',
      'Delivery and emergency addresses': 'ડિલિવરી અને ઇમરજન્સી સરનામાં',
      'Emergency Contacts': 'ઇમરજન્સી સંપર્કો',
      'Family and medical contacts': 'પરિવાર અને તબીબી સંપર્કો',
      'Notification Settings': 'નોટિફિકેશન સેટિંગ્સ',
      'Push notifications, alerts & silent hours': 'પુશ નોટિફિકેશન, એલર્ટ અને શાંત કલાકો',
      'Help & Support': 'મદદ અને સપોર્ટ',
      'FAQs, guide & support tickets': 'પ્રશ્નોત્તરી, માર્ગદર્શિકા અને ટિકિટ',
      'Order History': 'ઓર્ડર ઇતિહાસ',
      'View past orders and tracking': 'પાછલા ઓર્ડર અને ટ્રેકિંગ જુઓ',
      'Membership': 'મેમ્બરશિપ',
      'View benefits and renew plan': 'લાભો જુઓ અને પ્લાન રિન્યુ કરો',
      'About CarQConnect': 'CarQConnect વિશે',
      'App version, build and company info': 'એપ વર્ઝન, બિલ્ડ અને કંપની માહિતી',
      'Privacy Policy': 'ગોપનીયતા નીતિ',
      'How we handle your data': 'અમે તમારા ડેટાની કાળજી કેવી રીતે રાખીએ છીએ',
      'Terms of Service': 'સેવાની શરતો',
      'Rules and regulations': 'નિયમો અને કાયદા',
      'Log Out': 'લોગ આઉટ',
      'Sign out of your account': 'તમારા ખાતામાંથી સાઇન આઉટ કરો',
      'Are you sure you want to log out?': 'શું તમે ખરેખર લોગ આઉટ કરવા માંગો છો?',
      'Cancel': 'રદ કરો',

      'Quick Actions': 'ઝડપી કાર્યો',
      'Start Trip': 'મુસાફરી શરૂ કરો',
      'Track Vehicle': 'વાહન ટ્રેક કરો',
      'Battery': 'બેટરી',
      'Fuel': 'ઈંધણ',
      'Emergency SOS': 'ઇમરજન્સી એસઓએસ',
    },

    // -------------------------------------------------------------
    // TAMIL (ta_IN)
    // -------------------------------------------------------------
    'ta_IN': {
      'Home': 'முகப்பு',
      'Garage': 'கேரேஜ்',
      'Products': 'பொருட்கள்',
      'Profile': 'சுயவிவரம்',
      'Account': 'கணக்கு',
      'SOS': 'அவசரம்',

      'Language': 'மொழி',
      'Select preferred language': 'விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
      'Select your preferred language': 'உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்',
      'Search language (e.g. Hindi, English)...': 'மொழியைத் தேடுங்கள்...',
      'Apply': 'பயன்படுத்து',
      'Save & Apply': 'சேமித்து பயன்படுத்து',
      'Language updated to': 'மொழி மாற்றப்பட்டது',

      'Account Settings': 'கணக்கு அமைப்புகள்',
      'Support & Legal': 'ஆதரவு மற்றும் சட்டம்',
      'Profile Completion': 'சுயவிவர நிறைவு',
      'Edit Profile': 'சுயவிவரத்தைத் திருத்து',
      'Personal Information': 'தனிப்பட்ட தகவல்',
      'My Vehicles': 'எனது வாகனங்கள்',
      'View and manage your registered cars': 'பதிவு செய்யப்பட்ட கார்களை நிர்வகிக்கவும்',
      'Saved Addresses': 'சேமிக்கப்பட்ட முகவரிகள்',
      'Delivery and emergency addresses': 'டெலிவரி மற்றும் அவசர முகவரிகள்',
      'Emergency Contacts': 'அவசர தொடர்புகள்',
      'Family and medical contacts': 'குடும்பம் மற்றும் மருத்துவ தொடர்புகள்',
      'Notification Settings': 'அறிவிப்பு அமைப்புகள்',
      'Help & Support': 'உதவி & ஆதரவு',
      'Order History': 'ஆர்டர் வரலாறு',
      'Membership': 'உறுப்பினர் சேர்க்கை',
      'About CarQConnect': 'CarQConnect பற்றி',
      'Privacy Policy': 'தனியுரிமைக் கொள்கை',
      'Terms of Service': 'சேவை விதிமுறைகள்',
      'Log Out': 'வெளியேறு',
      'Cancel': 'ரத்துசெய்',
      'Start Trip': 'பயணத்தைத் தொடங்கு',
      'Track Vehicle': 'வாகனத்தைக் கண்காணிக்கவும்',
    },

    // -------------------------------------------------------------
    // TELUGU (te_IN)
    // -------------------------------------------------------------
    'te_IN': {
      'Home': 'హోమ్',
      'Garage': 'గ్యారేజ్',
      'Products': 'ఉత్పత్తులు',
      'Profile': 'ప్రొఫైల్',
      'Account': 'ఖాతా',
      'SOS': 'అత్యవసరం',

      'Language': 'భాష',
      'Select preferred language': 'భాషను ఎంచుకోండి',
      'Select your preferred language': 'మీకు నచ్చిన భాషను ఎంచుకోండి',
      'Search language (e.g. Hindi, English)...': 'భాషను వెతకండి...',
      'Apply': 'వర్తింపజేయి',
      'Save & Apply': 'సేవ్ చేసి వర్తింపజేయి',
      'Language updated to': 'భాష మార్చబడింది',

      'Account Settings': 'ఖాతా సెట్టింగ్‌లు',
      'Support & Legal': 'మద్దతు మరియు చట్టపరమైన',
      'Personal Information': 'వ్యక్తిగత సమాచారం',
      'My Vehicles': 'నా వాహనాలు',
      'Saved Addresses': 'సేవ్ చేసిన చిరునామాలు',
      'Emergency Contacts': 'అత్యవసర పరిచయాలు',
      'Notification Settings': 'నోటిఫికేషన్ సెట్టింగ్‌లు',
      'Help & Support': 'సహాయం & మద్దతు',
      'Order History': 'ఆర్డర్ చరిత్ర',
      'Membership': 'సభ్యత్వం',
      'About CarQConnect': 'CarQConnect గురించి',
      'Privacy Policy': 'గోప్యతా విధానం',
      'Terms of Service': 'సేవా నిబంధనలు',
      'Log Out': 'లాగ్ అవుట్',
      'Cancel': 'రద్దు చేయి',
      'Start Trip': 'ప్రయాణం ప్రారంభించండి',
      'Track Vehicle': 'వాహనాన్ని ట్రాక్ చేయండి',
    },

    // -------------------------------------------------------------
    // KANNADA (kn_IN)
    // -------------------------------------------------------------
    'kn_IN': {
      'Home': 'ಮುಖಪುಟ',
      'Garage': 'ಗ್ಯಾರೇಜ್',
      'Products': 'ಉತ್ಪನ್ನಗಳು',
      'Profile': 'ಪ್ರೊಫೈಲ್',
      'Account': 'ಖಾತೆ',
      'SOS': 'ತುರ್ತು',

      'Language': 'ಭಾಷೆ',
      'Select preferred language': 'ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      'Select your preferred language': 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      'Apply': 'ಅನ್ವಯಿಸು',
      'Save & Apply': 'ಉಳಿಸಿ ಮತ್ತು ಅನ್ವಯಿಸಿ',
      'Language updated to': 'ಭಾಷೆ ನವೀಕರಿಸಲಾಗಿದೆ',

      'Account Settings': 'ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      'Support & Legal': 'ಬೆಂಬಲ ಮತ್ತು ಕಾನೂನು',
      'Personal Information': 'ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ',
      'My Vehicles': 'ನನ್ನ ವಾಹನಗಳು',
      'Saved Addresses': 'ಉಳಿಸಿದ ವಿಳಾಸಗಳು',
      'Emergency Contacts': 'ತುರ್ತು ಸಂಪರ್ಕಗಳು',
      'Notification Settings': 'ಅಧಿಸೂಚನೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      'Help & Support': 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',
      'Order History': 'ಆರ್ಡರ್ ಇತಿಹಾಸ',
      'Membership': 'ಸದಸ್ಯತ್ವ',
      'About CarQConnect': 'CarQConnect ಬಗ್ಗೆ',
      'Privacy Policy': 'ಗೌಪ್ಯತಾ ನೀತಿ',
      'Terms of Service': 'ಸೇವಾ ನಿಯಮಗಳು',
      'Log Out': 'ಲಾಗ್ ಔಟ್',
      'Cancel': 'ರದ್ದುಮಾಡಿ',
    },

    // -------------------------------------------------------------
    // BENGALI (bn_IN)
    // -------------------------------------------------------------
    'bn_IN': {
      'Home': 'হোম',
      'Garage': 'গ্যারেজ',
      'Products': 'পণ্যসমূহ',
      'Profile': 'প্রোফাইল',
      'Account': 'অ্যাকাউন্ট',
      'SOS': 'জরুরী',

      'Language': 'ভাষা',
      'Select preferred language': 'পছন্দের ভাষা নির্বাচন করুন',
      'Select your preferred language': 'আপনার পছন্দের ভাষা নির্বাচন করুন',
      'Apply': 'প্রয়োগ করুন',
      'Save & Apply': 'সংরক্ষণ এবং প্রয়োগ করুন',
      'Language updated to': 'ভাষা পরিবর্তন করা হয়েছে',

      'Account Settings': 'অ্যাকাউন্ট সেটিংস',
      'Support & Legal': 'সহায়তা এবং আইনি',
      'Personal Information': 'ব্যক্তিগত তথ্য',
      'My Vehicles': 'আমার যানবাহন',
      'Saved Addresses': 'সংরক্ষিত ঠিকানা',
      'Emergency Contacts': 'জরুরী যোগাযোগ',
      'Notification Settings': 'বিজ্ঞপ্তি সেটিংস',
      'Help & Support': 'সাহায্য ও সমর্থন',
      'Order History': 'অর্ডার ইতিহাস',
      'Membership': 'সদস্যপদ',
      'About CarQConnect': 'CarQConnect সম্পর্কে',
      'Privacy Policy': 'গোপনীয়তা নীতি',
      'Terms of Service': 'পরিষেবার শর্তাবলী',
      'Log Out': 'লগ আউট',
      'Cancel': 'বাতিল করুন',
    },

    // -------------------------------------------------------------
    // PUNJABI (pa_IN)
    // -------------------------------------------------------------
    'pa_IN': {
      'Home': 'ਹੋਮ',
      'Garage': 'ਗੈਰਾਜ',
      'Products': 'ਉਤਪਾਦ',
      'Profile': 'ਪ੍ਰੋਫਾਈਲ',
      'Account': 'ਖਾਤਾ',
      'SOS': 'ਐਮਰਜੈਂਸੀ',

      'Language': 'ਭਾਸ਼ਾ',
      'Select preferred language': 'ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਚੁਣੋ',
      'Select your preferred language': 'ਆਪਣੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਚੁਣੋ',
      'Apply': 'ਲਾਗੂ ਕਰੋ',
      'Save & Apply': 'ਸੰਭਾਲੋ ਅਤੇ ਲਾਗੂ ਕਰੋ',
      'Language updated to': 'ਭਾਸ਼ਾ ਅੱਪਡੇਟ ਕੀਤੀ ਗਈ',

      'Account Settings': 'ਖਾਤਾ ਸੈਟਿੰਗਾਂ',
      'Support & Legal': 'ਸਹਾਇਤਾ ਅਤੇ ਕਾਨੂੰਨੀ',
      'Personal Information': 'ਨਿੱਜੀ ਜਾਣਕਾਰੀ',
      'My Vehicles': 'ਮੇਰੇ ਵਾਹਨ',
      'Saved Addresses': 'ਸੰਭਾਲੇ ਪਤੇ',
      'Emergency Contacts': 'ਐਮਰਜੈਂਸੀ ਸੰਪਰਕ',
      'Notification Settings': 'ਸੂਚਨਾ ਸੈਟਿੰਗਾਂ',
      'Help & Support': 'ਮਦਦ ਅਤੇ ਸਹਾਇਤਾ',
      'Order History': 'ਆਰਡਰ ਇਤਿਹਾਸ',
      'Membership': 'ਮੈਂਬਰਸ਼ਿਪ',
      'About CarQConnect': 'CarQConnect ਬਾਰੇ',
      'Privacy Policy': 'ਗੋਪਨੀਯਤਾ ਨੀਤੀ',
      'Terms of Service': 'ਸੇਵਾ ਦੀਆਂ ਸ਼ਰਤਾਂ',
      'Log Out': 'ਲਾਗ ਆਉਟ',
      'Cancel': 'ਰੱਦ ਕਰੋ',
    },

    // -------------------------------------------------------------
    // MALAYALAM (ml_IN)
    // -------------------------------------------------------------
    'ml_IN': {
      'Home': 'ഹോം',
      'Garage': 'ഗ്യാരേജ്',
      'Products': 'ഉൽപ്പന്നങ്ങൾ',
      'Profile': 'പ്രൊഫൈൽ',
      'Account': 'അക്കൗണ്ട്',
      'SOS': 'അടിയന്തരം',

      'Language': 'ഭാഷ',
      'Select preferred language': 'ഭാഷ തിരഞ്ഞെടുക്കുക',
      'Select your preferred language': 'നിങ്ങളുടെ ഇഷ്ടപ്പെട്ട ഭാഷ തിരഞ്ഞെടുക്കുക',
      'Apply': 'പ്രയോഗിക്കുക',
      'Save & Apply': 'സേവ് ചെയ്യുക',
      'Language updated to': 'ഭാഷ മാറ്റിയിരിക്കുന്നു',

      'Account Settings': 'അക്കൗണ്ട് ക്രമീകരണങ്ങൾ',
      'Support & Legal': 'പിന്തുണയും നിയമപരവും',
      'Personal Information': 'വ്യക്തിഗത വിവരങ്ങൾ',
      'My Vehicles': 'എന്റെ വാഹനങ്ങൾ',
      'Saved Addresses': 'സംരക്ഷിച്ച വിലാസങ്ങൾ',
      'Emergency Contacts': 'അടിയന്തര കോൺടാക്റ്റുകൾ',
      'Notification Settings': 'അറിയിപ്പ് ക്രമീകരണങ്ങൾ',
      'Help & Support': 'സഹായവും പിന്തുണയും',
      'Order History': 'ഓർഡർ ചരിത്രം',
      'Membership': 'അംഗത്വം',
      'About CarQConnect': 'CarQConnect കുറിച്ച്',
      'Privacy Policy': 'സ്വകാര്യതാ നയം',
      'Terms of Service': 'സേവന നിബന്ധനകൾ',
      'Log Out': 'ലോഗ് ഔട്ട്',
      'Cancel': 'റദ്ദാക്കുക',
    },
  };
}
