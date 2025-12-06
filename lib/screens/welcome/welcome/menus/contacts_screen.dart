import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../navbar/welcome_navbar.dart';
import '../../../../shared/widgets/welcome_footer.dart';
import '../../../../shared/widgets/app_logo_header.dart';
import '../welcome_screen.dart';
import 'company_screen.dart';
import 'destinations_screen.dart';
import 'servicios_screen.dart';
import 'profesionalidad.dart';
import 'tours_screen.dart';
import 'weddings_screen.dart';
import 'terms_screen.dart';
import 'privacy_policy_screen.dart';
import '../../../../auth/login_screen.dart';
import '../../../../l10n/app_localizations.dart';

// Constants
const _kSpacing = 16.0;
const _kBorderRadius = 12.0;
const _kPrimaryColor = Color(0xFF1D4ED8);

// Card dimensions - Mismo estilo que servicios
const _kCardWidthTablet = 60.0;
const _kCardHeightTablet = 25.0;
const _kCardAspectRatioTablet = _kCardWidthTablet / _kCardHeightTablet;

const _kCardWidthMobile = 60.0;
const _kCardHeightMobile = 25.0;
const _kCardAspectRatioMobile = _kCardWidthMobile / _kCardHeightMobile;

/// Pantalla de contactos
class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key});

  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  User? _currentUser;
  StreamSubscription<User?>? _authSubscription;

  @override
  void initState() {
    super.initState();
    bool firebaseInitialized = false;
    try {
      firebaseInitialized = Firebase.apps.isNotEmpty;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ⚠️ Error verificando Firebase: $e');
      }
      firebaseInitialized = false;
    }

    if (!firebaseInitialized) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ⚠️ Firebase no inicializado');
      }
      _currentUser = null;
      return;
    }

    try {
      _currentUser = FirebaseAuth.instance.currentUser;
      _authSubscription = FirebaseAuth.instance.authStateChanges().listen((User? user) {
        if (mounted) {
          setState(() => _currentUser = user);
        }
      });
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ⚠️ Error obteniendo usuario: $e');
      }
      _currentUser = null;
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  void _navigateToLogin() {
    Navigator.of(context).push(MaterialPageRoute(builder: (context) => const LoginScreen()));
  }

  void _navigateToProfile() {
    final l10n = AppLocalizations.of(context);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n?.profileComingSoon ?? 'Mi perfil (próximamente)')));
  }

  Future<void> _handleLogout() async {
    if (!mounted) return;
    try {
      await FirebaseAuth.instance.signOut();
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const WelcomeScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${l10n?.logoutError ?? 'Error al cerrar sesión'}: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _navigateToWelcomePath() {
    if (kDebugMode) {
      debugPrint('[ContactsScreen] _navigateToWelcomePath llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a WelcomeScreen: $e');
        debugPrint('[ContactsScreen] Stack trace: $stackTrace');
      }
      try {
        Navigator.of(context).push(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
      } catch (e2) {
        if (kDebugMode) {
          debugPrint('[ContactsScreen] ❌ Error en fallback también: $e2');
        }
      }
    }
  }

  void _navigateToCompany() {
    if (kDebugMode) {
      debugPrint('[ContactsScreen] _navigateToCompany llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const CompanyScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a CompanyScreen: $e');
      }
    }
  }

  void _navigateToDestination() {
    if (kDebugMode) {
      debugPrint('[ContactsScreen] _navigateToDestination llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const DestinationsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a DestinationsScreen: $e');
      }
    }
  }

  void _navigateToContacts() {
    // Ya estamos en la pantalla de contactos
  }

  void _navigateToServices() {
    if (kDebugMode) {
      debugPrint('[ContactsScreen] _navigateToServices llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const ServiciosScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a ServiciosScreen: $e');
      }
    }
  }

  void _navigateToAbout() {
    if (kDebugMode) {
      debugPrint('[ContactsScreen] _navigateToAbout llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const AcercaDeScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a AcercaDeScreen: $e');
      }
    }
  }

  void _navigateToTours() {
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const ToursScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a ToursScreen: $e');
      }
    }
  }

  void _navigateToWeddings() {
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const WeddingsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a WeddingsScreen: $e');
      }
    }
  }

  void _navigateToTerms() {
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const TermsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a TermsScreen: $e');
      }
    }
  }

  void _navigateToPrivacy() {
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const PrivacyPolicyScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ContactsScreen] ❌ Error navegando a PrivacyPolicyScreen: $e');
      }
    }
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 900;

    return Scaffold(
      extendBodyBehindAppBar: false,
      backgroundColor: Colors.white,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                const Color(0xFF1C1C1C).withValues(alpha: 0.95),
                const Color(0xFF000000).withValues(alpha: 0.95),
              ],
            ),
          ),
          child: WelcomeNavbar(
            currentUser: _currentUser,
            onNavigateToLogin: _navigateToLogin,
            onNavigateToProfile: _navigateToProfile,
            onHandleLogout: _handleLogout,
            onNavigateToWelcomePath: _navigateToWelcomePath,
            onNavigateToCompany: _navigateToCompany,
            onNavigateToServices: _navigateToServices,
            onNavigateToAbout: _navigateToAbout,
            onNavigateToDestination: _navigateToDestination,
            onNavigateToContacts: null, // Ya estamos aquí
            onNavigateToTours: _navigateToTours,
            onNavigateToWeddings: _navigateToWeddings,
            onNavigateToTerms: _navigateToTerms,
          ),
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Contenido principal (scrollable)
              Expanded(
                child: Stack(
                  children: [
                    // Fondo blanco
                    Container(color: Colors.white),
                    SafeArea(
                      child: SingleChildScrollView(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(
                            isTablet ? 48.0 : 24.0,
                            isTablet ? 24.0 : 16.0,
                            isTablet ? 48.0 : 24.0,
                            8.0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: _kSpacing), // Espacio para el navbar
                              // Contenido principal
                              _buildIntroSection(isTablet),
                              SizedBox(height: _kSpacing * (isTablet ? 2 : 1.5)),
                              _buildContactsGrid(isTablet),
                              const SizedBox(height: _kSpacing * 2),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Footer siempre al final (fuera del scroll)
              WelcomeFooter(
                onNavigateToWelcome: _navigateToWelcomePath,
                onNavigateToDestination: _navigateToDestination,
                onNavigateToCompany: _navigateToCompany,
                onNavigateToContacts: _navigateToContacts,
                onNavigateToServices: _navigateToServices,
                onNavigateToAbout: _navigateToAbout,
                onNavigateToTerms: _navigateToTerms,
                onNavigateToPrivacy: _navigateToPrivacy,
              ),
            ],
          ),
          // Logo flotante
          AppLogoHeader(onTap: _navigateToWelcomePath),
        ],
      ),
    );
  }

  Widget _buildIntroSection(bool isTablet) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        return Center(
          child: Container(
            constraints: BoxConstraints(maxWidth: isTablet ? 1500 : double.infinity),
            child: Text(
              l10n?.contactsIntro ??
                  'Estamos aquí para ayudarte. Contáctanos a través de cualquiera de nuestros canales y te responderemos lo antes posible.',
              style: GoogleFonts.exo(
                fontSize: isTablet ? 18 : 16,
                color: const Color(0xFF1A202C),
                height: 1.5,
                fontWeight: FontWeight.w400,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        );
      },
    );
  }

  Widget _buildContactsGrid(bool isTablet) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        final contacts = [
          {
            'icon': Icons.email_outlined,
            'title': l10n?.contactsEmail ?? 'Email',
            'description': l10n?.contactsEmailDesc ?? 'Escríbenos a nuestro correo electrónico',
            'action': 'info@lasiciliatour.com',
            'url': 'mailto:info@lasiciliatour.com',
          },
          {
            'icon': Icons.language_outlined,
            'title': l10n?.contactsWebsite ?? 'Sitio Web',
            'description': l10n?.contactsWebsiteDesc ?? 'Visita nuestro sitio web oficial',
            'action': 'www.eugeniastravelconsultancy.com',
            'url': 'https://www.eugeniastravelconsultancy.com/',
          },
          {
            'icon': Icons.location_on_outlined,
            'title': l10n?.contactsLocation ?? 'Ubicación',
            'description': l10n?.contactsLocationDesc ?? 'Estamos ubicados en Sicilia, Italia',
            'action': 'Sicilia, Italia',
            'url': null,
          },
        ];

        if (isTablet) {
          // Grid de 3 columnas en tablet
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: _kSpacing * 2,
              mainAxisSpacing: _kSpacing * 2,
              childAspectRatio: _kCardAspectRatioTablet,
            ),
            itemCount: contacts.length,
            itemBuilder: (context, index) => _buildContactCard(contacts[index], isTablet),
          );
        } else {
          // Grid de 2 columnas en móvil
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: _kSpacing,
              mainAxisSpacing: _kSpacing,
              childAspectRatio: _kCardAspectRatioMobile,
            ),
            itemCount: contacts.length,
            itemBuilder: (context, index) => _buildContactCard(contacts[index], isTablet),
          );
        }
      },
    );
  }

  Widget _buildContactCard(Map<String, dynamic> contact, bool isTablet) {
    return _HoverableCard(
      onTap: contact['url'] != null ? () => _launchUrl(contact['url'] as String) : null,
      child: Padding(
        padding: EdgeInsets.all(isTablet ? _kSpacing * 1.5 : _kSpacing),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Icono circular con fondo azul claro
            Container(
              width: isTablet ? 80 : 64,
              height: isTablet ? 80 : 64,
              decoration: BoxDecoration(
                color: _kPrimaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: _kPrimaryColor.withValues(alpha: 0.3), width: 2),
              ),
              child: Icon(
                contact['icon'] as IconData,
                color: _kPrimaryColor,
                size: isTablet ? 36 : 28,
              ),
            ),
            SizedBox(height: _kSpacing * 1.2),
            // Título
            Text(
              contact['title'] as String,
              style: GoogleFonts.exo(
                fontSize: isTablet ? 18 : 14,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1A202C),
                height: 1.3,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: _kSpacing * 0.8),
            // Descripción
            Text(
              contact['description'] as String,
              style: GoogleFonts.exo(
                fontSize: isTablet ? 13 : 11,
                color: Colors.grey.shade700,
                height: 1.5,
                fontWeight: FontWeight.w400,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: _kSpacing * 0.5),
            // Acción/URL
            Text(
              contact['action'] as String,
              style: GoogleFonts.exo(
                fontSize: isTablet ? 12 : 10,
                color: _kPrimaryColor,
                height: 1.4,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

/// Widget que maneja el efecto hover con elevación animada
class _HoverableCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const _HoverableCard({required this.child, this.onTap});

  @override
  State<_HoverableCard> createState() => _HoverableCardState();
}

class _HoverableCardState extends State<_HoverableCard> with SingleTickerProviderStateMixin {
  bool _isHovered = false;
  late AnimationController _controller;
  late Animation<double> _elevationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(milliseconds: 200), vsync: this);
    _elevationAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) {
        setState(() => _isHovered = true);
        _controller.forward();
      },
      onExit: (_) {
        setState(() => _isHovered = false);
        _controller.reverse();
      },
      child: AnimatedBuilder(
        animation: _elevationAnimation,
        builder: (context, child) {
          final elevation = _elevationAnimation.value;
          final shadowOffset = 4.0 + (elevation * 4.0); // De 4 a 8
          final shadowBlur = 10.0 + (elevation * 15.0); // De 10 a 25
          final shadowSpread = 1.0 + (elevation * 2.0); // De 1 a 3
          final shadowAlpha = 0.08 + (elevation * 0.12); // De 0.08 a 0.20

          return Transform.translate(
            offset: Offset(0, -elevation * 4), // Se eleva hasta 4px
            child: InkWell(
              onTap: widget.onTap,
              borderRadius: BorderRadius.circular(_kBorderRadius),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(_kBorderRadius),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: shadowAlpha),
                      blurRadius: shadowBlur,
                      offset: Offset(0, shadowOffset),
                      spreadRadius: shadowSpread,
                    ),
                    if (_isHovered)
                      BoxShadow(
                        color: _kPrimaryColor.withValues(alpha: 0.1 * elevation),
                        blurRadius: shadowBlur * 1.5,
                        offset: Offset(0, shadowOffset),
                        spreadRadius: shadowSpread * 1.5,
                      ),
                  ],
                ),
                child: widget.child,
              ),
            ),
          );
        },
      ),
    );
  }
}
