import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../navbar/welcome_navbar.dart';
import '../../../../shared/widgets/welcome_footer.dart';
import '../../../../shared/widgets/app_logo_header.dart';
import '../welcome_screen.dart';
import 'destinations_screen.dart';
import 'company_screen.dart';
import 'contacts_screen.dart';
import 'servicios_screen.dart';
import 'profesionalidad.dart';
import 'tours_screen.dart';
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

/// Pantalla de servicios para Matrimonios/Bodas
class WeddingsScreen extends StatefulWidget {
  const WeddingsScreen({super.key});

  @override
  State<WeddingsScreen> createState() => _WeddingsScreenState();
}

class _WeddingsScreenState extends State<WeddingsScreen> {
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
        debugPrint('[WeddingsScreen] ⚠️ Error verificando Firebase: $e');
      }
      firebaseInitialized = false;
    }

    if (!firebaseInitialized) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ⚠️ Firebase no inicializado');
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
        debugPrint('[WeddingsScreen] ⚠️ Error obteniendo usuario: $e');
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
      debugPrint('[WeddingsScreen] _navigateToWelcomePath llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ❌ Error navegando a WelcomeScreen: $e');
        debugPrint('[WeddingsScreen] Stack trace: $stackTrace');
      }
      try {
        Navigator.of(context).push(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
      } catch (e2) {
        if (kDebugMode) {
          debugPrint('[WeddingsScreen] ❌ Error en fallback también: $e2');
        }
      }
    }
  }

  void _navigateToCompany() {
    if (kDebugMode) {
      debugPrint('[WeddingsScreen] _navigateToCompany llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const CompanyScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ❌ Error navegando a CompanyScreen: $e');
      }
    }
  }

  void _navigateToServices() {
    if (kDebugMode) {
      debugPrint('[WeddingsScreen] _navigateToServices llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const ServiciosScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ❌ Error navegando a ServiciosScreen: $e');
      }
    }
  }

  void _navigateToDestination() {
    if (kDebugMode) {
      debugPrint('[WeddingsScreen] _navigateToDestination llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const DestinationsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ❌ Error navegando a DestinationsScreen: $e');
      }
    }
  }

  void _navigateToContacts() {
    if (kDebugMode) {
      debugPrint('[WeddingsScreen] _navigateToContacts llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const ContactsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ❌ Error navegando a ContactsScreen: $e');
      }
    }
  }

  void _navigateToAbout() {
    if (kDebugMode) {
      debugPrint('[WeddingsScreen] _navigateToAbout llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const AcercaDeScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WeddingsScreen] ❌ Error navegando a AcercaDeScreen: $e');
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
        debugPrint('[WeddingsScreen] ❌ Error navegando a ToursScreen: $e');
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
        debugPrint('[WeddingsScreen] ❌ Error navegando a TermsScreen: $e');
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
        debugPrint('[WeddingsScreen] ❌ Error navegando a PrivacyPolicyScreen: $e');
      }
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
            onNavigateToContacts: _navigateToContacts,
            onNavigateToTours: _navigateToTours,
            onNavigateToWeddings: null, // Ya estamos aquí
            onNavigateToTerms: _navigateToTerms,
          ),
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Contenido principal
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
                              _buildServicesGrid(isTablet),
                              SizedBox(height: _kSpacing * (isTablet ? 2 : 1.5)),
                              _buildPackagesSection(isTablet),
                              const SizedBox(height: _kSpacing * 2),
                              // Footer
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
                        ),
                      ),
                    ),
                  ],
                ),
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
              l10n?.weddingsIntro ??
                  'Hacemos de tu día especial una experiencia inolvidable con nuestro servicio premium de transporte. Vehículos de lujo, conductores profesionales y atención personalizada para tu boda o evento especial.',
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

  Widget _buildServicesGrid(bool isTablet) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        final services = [
          {
            'icon': Icons.directions_car,
            'title': l10n?.weddingsServiceTransportTitle ?? 'Transporte de Novios',
            'description':
                l10n?.weddingsServiceTransportDesc ??
                'Vehículos de lujo para el traslado de los novios en su día especial. Mercedes-Benz, BMW y otros vehículos premium.',
          },
          {
            'icon': Icons.airport_shuttle,
            'title': l10n?.weddingsServiceGuestsTitle ?? 'Traslado de Invitados',
            'description':
                l10n?.weddingsServiceGuestsDesc ??
                'Minibuses y vans cómodos para transportar a todos tus invitados de forma segura y puntual.',
          },
          {
            'icon': Icons.celebration,
            'title': l10n?.weddingsServiceReceptionTitle ?? 'Servicio de Recepción',
            'description':
                l10n?.weddingsServiceReceptionDesc ??
                'Transporte coordinado desde la ceremonia a la recepción, asegurando que todos lleguen a tiempo.',
          },
          {
            'icon': Icons.local_hotel,
            'title': l10n?.weddingsServiceHotelTitle ?? 'Traslado al Hotel',
            'description':
                l10n?.weddingsServiceHotelDesc ??
                'Servicio nocturno para novios e invitados, con vehículos disponibles hasta altas horas de la noche.',
          },
        ];

        if (isTablet) {
          // Grid de 3 columnas en tablet (como servicios)
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: _kSpacing * 2,
              mainAxisSpacing: _kSpacing * 2,
              childAspectRatio: _kCardAspectRatioTablet,
            ),
            itemCount: services.length,
            itemBuilder: (context, index) => _buildServiceCard(services[index], isTablet),
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
            itemCount: services.length,
            itemBuilder: (context, index) => _buildServiceCard(services[index], isTablet),
          );
        }
      },
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> service, bool isTablet) {
    return _HoverableWeddingCard(
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
                service['icon'] as IconData,
                color: _kPrimaryColor,
                size: isTablet ? 36 : 28,
              ),
            ),
            SizedBox(height: _kSpacing * 1.2),
            // Título
            Text(
              service['title'] as String,
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
              service['description'] as String,
              style: GoogleFonts.exo(
                fontSize: isTablet ? 13 : 11,
                color: Colors.grey.shade700,
                height: 1.5,
                fontWeight: FontWeight.w400,
              ),
              textAlign: TextAlign.center,
              maxLines: 5,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPackagesSection(bool isTablet) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        return Container(
          width: double.infinity,
          padding: EdgeInsets.all(isTablet ? _kSpacing * 2 : _kSpacing * 1.5),
          color: Colors.white,
          child: Column(
            children: [
              Text(
                l10n?.weddingsPackages ?? 'Paquetes Personalizados',
                style: GoogleFonts.exo(
                  fontSize: isTablet ? 32 : 28,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A202C),
                ),
              ),
              SizedBox(height: _kSpacing * (isTablet ? 1.5 : 1)),
              Container(
                constraints: BoxConstraints(maxWidth: isTablet ? 600 : double.infinity),
                child: Text(
                  l10n?.weddingsPackagesDesc ??
                      'Creamos paquetes a medida según el número de invitados y tus necesidades específicas',
                  style: GoogleFonts.exo(
                    fontSize: isTablet ? 16 : 14,
                    color: Colors.grey.shade600,
                    height: 1.6,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              SizedBox(height: _kSpacing * (isTablet ? 2 : 1.5)),
              ElevatedButton.icon(
                onPressed: () async {
                  // Abrir WhatsApp con mensaje personalizado
                  if (!mounted) return;
                  final scaffoldMessenger = ScaffoldMessenger.of(context);
                  final whatsappNumber = dotenv.env['WHATSAPP_NUMBER'] ?? '393921774905';
                  final message =
                      l10n?.weddingsContactUs ??
                      'Hola, necesito información sobre paquetes para bodas';
                  final encodedMessage = Uri.encodeComponent(message);
                  final whatsappUrl = 'https://wa.me/$whatsappNumber?text=$encodedMessage';
                  final uri = Uri.parse(whatsappUrl);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                    if (!mounted) return;
                    scaffoldMessenger.showSnackBar(
                      const SnackBar(
                        content: Text('No se pudo abrir WhatsApp'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.phone, size: 20),
                label: Text(
                  l10n?.weddingsContactUs ?? 'Contáctanos para cotización',
                  style: GoogleFonts.exo(fontSize: isTablet ? 16 : 14, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kPrimaryColor,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(
                    horizontal: isTablet ? _kSpacing * 3 : _kSpacing * 2,
                    vertical: isTablet ? _kSpacing * 1.5 : _kSpacing,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(_kBorderRadius),
                  ),
                  elevation: 6,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Widget que maneja el efecto hover con elevación animada para tarjetas de bodas
class _HoverableWeddingCard extends StatefulWidget {
  final Widget child;

  const _HoverableWeddingCard({required this.child});

  @override
  State<_HoverableWeddingCard> createState() => _HoverableWeddingCardState();
}

class _HoverableWeddingCardState extends State<_HoverableWeddingCard>
    with SingleTickerProviderStateMixin {
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
          final shadowOffset = 4.0 + (elevation * 4.0);
          final shadowBlur = 10.0 + (elevation * 15.0);
          final shadowSpread = 1.0 + (elevation * 2.0);
          final shadowAlpha = 0.08 + (elevation * 0.12);

          return Transform.translate(
            offset: Offset(0, -elevation * 4),
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
          );
        },
      ),
    );
  }
}
