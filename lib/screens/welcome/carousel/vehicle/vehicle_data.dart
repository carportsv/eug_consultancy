/// Datos de los vehículos disponibles
/// Extraído de welcome_screen.dart
class VehicleData {
  static List<Map<String, dynamic>> get vehicles => [
    {
      'key': 'sedan',
      'image': 'assets/images/cars/sedan.jpg',
      'passengers': 3,
      'luggage': 1,
      'descriptionKey': 'sedanDesc',
    },
    {
      'key': 'business',
      'image': 'assets/images/cars/sedan.jpg',
      'passengers': 2,
      'luggage': 1,
      'descriptionKey': 'businessDesc',
    },
    {
      'key': 'minivan7pax',
      'image': 'assets/images/cars/van.jpg',
      'passengers': 7,
      'luggage': 3,
      'descriptionKey': 'minivan7paxDesc',
    },
    {
      'key': 'minivanLuxury6pax',
      'image': 'assets/images/cars/luxury.jpg',
      'passengers': 6,
      'luggage': 3,
      'descriptionKey': 'minivanLuxury6paxDesc',
    },
    {
      'key': 'minibus8pax',
      'image': 'assets/images/cars/van.jpg',
      'passengers': 8,
      'luggage': 4,
      'descriptionKey': 'minibus8paxDesc',
    },
    {
      'key': 'bus16pax',
      'image': 'assets/images/cars/van.jpg',
      'passengers': 16,
      'luggage': 8,
      'descriptionKey': 'bus16paxDesc',
    },
    {
      'key': 'bus19pax',
      'image': 'assets/images/cars/van.jpg',
      'passengers': 19,
      'luggage': 10,
      'descriptionKey': 'bus19paxDesc',
    },
    {
      'key': 'bus50pax',
      'image': 'assets/images/cars/van.jpg',
      'passengers': 50,
      'luggage': 20,
      'descriptionKey': 'bus50paxDesc',
    },
  ];
}
