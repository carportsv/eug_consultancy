import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../navbar/welcome_navbar.dart';
import '../../../../shared/widgets/welcome_footer.dart';
import '../../../../shared/widgets/app_logo_header.dart';
import '../welcome_screen.dart';
import 'destinations_screen.dart';
import 'company_screen.dart';
import 'contacts_screen.dart';
import 'servicios_screen.dart';
import 'profesionalidad.dart';
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

/// Pantalla de Tours turísticos
class ToursScreen extends StatefulWidget {
  const ToursScreen({super.key});

  @override
  State<ToursScreen> createState() => _ToursScreenState();
}

class _ToursScreenState extends State<ToursScreen> {
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
        debugPrint('[ToursScreen] ⚠️ Error verificando Firebase: $e');
      }
      firebaseInitialized = false;
    }

    if (!firebaseInitialized) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ⚠️ Firebase no inicializado');
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
        debugPrint('[ToursScreen] ⚠️ Error obteniendo usuario: $e');
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
      debugPrint('[ToursScreen] _navigateToWelcomePath llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ❌ Error navegando a WelcomeScreen: $e');
        debugPrint('[ToursScreen] Stack trace: $stackTrace');
      }
      try {
        Navigator.of(context).push(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
      } catch (e2) {
        if (kDebugMode) {
          debugPrint('[ToursScreen] ❌ Error en fallback también: $e2');
        }
      }
    }
  }

  void _navigateToCompany() {
    if (kDebugMode) {
      debugPrint('[ToursScreen] _navigateToCompany llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const CompanyScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ❌ Error navegando a CompanyScreen: $e');
      }
    }
  }

  void _navigateToServices() {
    if (kDebugMode) {
      debugPrint('[ToursScreen] _navigateToServices llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const ServiciosScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ❌ Error navegando a ServiciosScreen: $e');
      }
    }
  }

  void _navigateToDestination() {
    if (kDebugMode) {
      debugPrint('[ToursScreen] _navigateToDestination llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const DestinationsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ❌ Error navegando a DestinationsScreen: $e');
      }
    }
  }

  void _navigateToContacts() {
    if (kDebugMode) {
      debugPrint('[ToursScreen] _navigateToContacts llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const ContactsScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ❌ Error navegando a ContactsScreen: $e');
      }
    }
  }

  void _navigateToAbout() {
    if (kDebugMode) {
      debugPrint('[ToursScreen] _navigateToAbout llamado');
    }
    if (!mounted) return;
    try {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (context) => const AcercaDeScreen()));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ToursScreen] ❌ Error navegando a AcercaDeScreen: $e');
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
        debugPrint('[ToursScreen] ❌ Error navegando a WeddingsScreen: $e');
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
        debugPrint('[ToursScreen] ❌ Error navegando a TermsScreen: $e');
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
        debugPrint('[ToursScreen] ❌ Error navegando a PrivacyPolicyScreen: $e');
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
            onNavigateToTours: null, // Ya estamos aquí
            onNavigateToWeddings: _navigateToWeddings,
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
                              _buildToursGrid(isTablet),
                              SizedBox(height: _kSpacing * (isTablet ? 3 : 2)),
                              _buildWhyChooseUs(isTablet),
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
              l10n?.toursIntro ??
                  'Descubre la belleza de Sicilia con nuestros tours personalizados. Experiencias únicas diseñadas para ti, con guías profesionales y vehículos de lujo.',
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

  Widget _buildToursGrid(bool isTablet) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        final tours = [
          {
            'icon': Icons.location_city,
            'title': l10n?.toursCityTitle ?? 'Tour por la Ciudad',
            'description':
                l10n?.toursCityDesc ??
                'Explora los lugares más emblemáticos de Sicilia con nuestro tour guiado por la ciudad.',
          },
          {
            'icon': Icons.museum,
            'title': l10n?.toursHistoricalTitle ?? 'Tour Histórico',
            'description':
                l10n?.toursHistoricalDesc ??
                'Descubre la rica historia y cultura siciliana visitando monumentos y sitios históricos.',
          },
          {
            'icon': Icons.restaurant,
            'title': l10n?.toursGastronomicTitle ?? 'Tour Gastronómico',
            'description':
                l10n?.toursGastronomicDesc ??
                'Degusta la auténtica cocina siciliana en los mejores restaurantes locales.',
          },
          {
            'icon': Icons.beach_access,
            'title': l10n?.toursCoastalTitle ?? 'Tour Costero',
            'description':
                l10n?.toursCoastalDesc ??
                'Disfruta de las playas más hermosas y paisajes costeros de Sicilia.',
          },
          {
            'icon': Icons.landscape,
            'title': l10n?.toursNatureTitle ?? 'Tour Natural',
            'description':
                l10n?.toursNatureDesc ??
                'Explora la naturaleza y paisajes sicilianos con rutas escénicas.',
          },
          {
            'icon': Icons.wine_bar,
            'title': l10n?.toursWineTitle ?? 'Tour de Vinos',
            'description':
                l10n?.toursWineDesc ??
                'Visita viñedos y cata vinos locales en las mejores bodegas de la región.',
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
            itemCount: tours.length,
            itemBuilder: (context, index) => _buildTourCard(tours[index], isTablet),
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
            itemCount: tours.length,
            itemBuilder: (context, index) => _buildTourCard(tours[index], isTablet),
          );
        }
      },
    );
  }

  Widget _buildTourCard(Map<String, dynamic> tour, bool isTablet) {
    return _HoverableTourCard(
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
                tour['icon'] as IconData,
                color: _kPrimaryColor,
                size: isTablet ? 36 : 28,
              ),
            ),
            SizedBox(height: _kSpacing * 1.2),
            // Título
            Text(
              tour['title'] as String,
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
              tour['description'] as String,
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

  Widget _buildWhyChooseUs(bool isTablet) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        return Container(
          width: double.infinity,
          padding: EdgeInsets.all(isTablet ? _kSpacing * 4 : _kSpacing * 2),
          color: Colors.white,
          child: Column(
            children: [
              Text(
                l10n?.toursWhyChooseUs ?? '¿Por qué elegirnos?',
                style: GoogleFonts.exo(
                  fontSize: isTablet ? 32 : 28,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A202C),
                ),
              ),
              SizedBox(height: _kSpacing * (isTablet ? 3 : 2)),
              Wrap(
                spacing: _kSpacing * (isTablet ? 3 : 2),
                runSpacing: _kSpacing * (isTablet ? 3 : 2),
                alignment: WrapAlignment.center,
                children: [
                  _buildFeature(
                    Icons.verified_user,
                    l10n?.toursFeature1Title ?? 'Guías Profesionales',
                    l10n?.toursFeature1Desc ?? 'Expertos locales certificados',
                    isTablet,
                  ),
                  _buildFeature(
                    Icons.groups,
                    l10n?.toursFeature2Title ?? 'Grupos Pequeños',
                    l10n?.toursFeature2Desc ?? 'Experiencia personalizada',
                    isTablet,
                  ),
                  _buildFeature(
                    Icons.star,
                    l10n?.toursFeature3Title ?? 'Mejor Valoración',
                    l10n?.toursFeature3Desc ?? '5 estrellas en reseñas',
                    isTablet,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFeature(IconData icon, String title, String description, bool isTablet) {
    return SizedBox(
      width: isTablet ? 250 : 200,
      child: Column(
        children: [
          Container(
            width: isTablet ? 80 : 70,
            height: isTablet ? 80 : 70,
            decoration: BoxDecoration(
              color: _kPrimaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: isTablet ? 40 : 35, color: _kPrimaryColor),
          ),
          SizedBox(height: _kSpacing),
          Text(
            title,
            style: GoogleFonts.exo(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1A202C),
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: _kSpacing * 0.5),
          Text(
            description,
            style: GoogleFonts.exo(fontSize: isTablet ? 14 : 13, color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// Widget que maneja el efecto hover con elevación animada para tarjetas de tours
class _HoverableTourCard extends StatefulWidget {
  final Widget child;

  const _HoverableTourCard({required this.child});

  @override
  State<_HoverableTourCard> createState() => _HoverableTourCardState();
}

class _HoverableTourCardState extends State<_HoverableTourCard>
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
