'use strict';

// Load modules


// Delcare internals

var internals = {
  rfc3986: {}
};

internals.generate = function () {

  /**
   * elements separated by forward slash ("/") are alternatives.
   */
  var or = '|';

  /**
   * Rule to support zero-padded addresses.
   */
  var zeroPad = '0?';

  /**
   * DIGIT = %x30-39 ; 0-9
   */
  var digit = '0-9';
  var digitOnly = '[' + digit + ']';

  /**
   * ALPHA = %x41-5A / %x61-7A   ; A-Z / a-z
   */
  var alpha = 'a-zA-Z';
  var alphaOnly = '[' + alpha + ']';

  /**
   * IPv4
   * cidr       = DIGIT                ; 0-9
   *            / %x31-32 DIGIT         ; 10-29
   *            / "3" %x30-32           ; 30-32
   */
  internals.rfc3986.ipv4Cidr = digitOnly + or + '[1-2]' + digitOnly + or + '3' + '[0-2]';

  /**
   * IPv6
   * cidr       = DIGIT                 ; 0-9
   *            / %x31-39 DIGIT         ; 10-99
   *            / "1" %x0-1 DIGIT       ; 100-119
   *            / "12" %x0-8            ; 120-128
   */
  internals.rfc3986.ipv6Cidr = '(?:' + zeroPad + zeroPad + digitOnly + or + zeroPad + '[1-9]' + digitOnly + or + '1' + '[01]' + digitOnly + or + '12[0-8])';

  /**
   * HEXDIG = DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
   */
  var hexDigit = digit + 'A-Fa-f';
  var hexDigitOnly = '[' + hexDigit + ']';

  /**
   * unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
   */
  var unreserved = alpha + digit + '-\\._~';

  /**
   * sub-delims = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
   */
  var subDelims = '!\\$&\'\\(\\)\\*\\+,;=';

  /**
   * pct-encoded = "%" HEXDIG HEXDIG
   */
  var pctEncoded = '%' + hexDigit;

  /**
   * pchar = unreserved / pct-encoded / sub-delims / ":" / "@"
   */
  var pchar = unreserved + pctEncoded + subDelims + ':@';
  var pcharOnly = '[' + pchar + ']';

  /**
   * dec-octet   = DIGIT                 ; 0-9
   *            / %x31-39 DIGIT         ; 10-99
   *            / "1" 2DIGIT            ; 100-199
   *            / "2" %x30-34 DIGIT     ; 200-249
   *            / "25" %x30-35          ; 250-255
   */
  var decOctect = '(?:' + zeroPad + zeroPad + digitOnly + or + zeroPad + '[1-9]' + digitOnly + or + '1' + digitOnly + digitOnly + or + '2' + '[0-4]' + digitOnly + or + '25' + '[0-5])';

  /**
   * IPv4address = dec-octet "." dec-octet "." dec-octet "." dec-octet
   */
  internals.rfc3986.IPv4address = '(?:' + decOctect + '\\.){3}' + decOctect;

  /**
   * h16 = 1*4HEXDIG ; 16 bits of address represented in hexadecimal
   * ls32 = ( h16 ":" h16 ) / IPv4address ; least-significant 32 bits of address
   * IPv6address =                            6( h16 ":" ) ls32
   *             /                       "::" 5( h16 ":" ) ls32
   *             / [               h16 ] "::" 4( h16 ":" ) ls32
   *             / [ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
   *             / [ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
   *             / [ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
   *             / [ *4( h16 ":" ) h16 ] "::"              ls32
   *             / [ *5( h16 ":" ) h16 ] "::"              h16
   *             / [ *6( h16 ":" ) h16 ] "::"
   */
  var h16 = hexDigitOnly + '{1,4}';
  var ls32 = '(?:' + h16 + ':' + h16 + '|' + internals.rfc3986.IPv4address + ')';
  var IPv6SixHex = '(?:' + h16 + ':){6}' + ls32;
  var IPv6FiveHex = '::(?:' + h16 + ':){5}' + ls32;
  var IPv6FourHex = '(?:' + h16 + ')?::(?:' + h16 + ':){4}' + ls32;
  var IPv6ThreeHex = '(?:(?:' + h16 + ':){0,1}' + h16 + ')?::(?:' + h16 + ':){3}' + ls32;
  var IPv6TwoHex = '(?:(?:' + h16 + ':){0,2}' + h16 + ')?::(?:' + h16 + ':){2}' + ls32;
  var IPv6OneHex = '(?:(?:' + h16 + ':){0,3}' + h16 + ')?::' + h16 + ':' + ls32;
  var IPv6NoneHex = '(?:(?:' + h16 + ':){0,4}' + h16 + ')?::' + ls32;
  var IPv6NoneHex2 = '(?:(?:' + h16 + ':){0,5}' + h16 + ')?::' + h16;
  var IPv6NoneHex3 = '(?:(?:' + h16 + ':){0,6}' + h16 + ')?::';
  internals.rfc3986.IPv6address = '(?:' + IPv6SixHex + or + IPv6FiveHex + or + IPv6FourHex + or + IPv6ThreeHex + or + IPv6TwoHex + or + IPv6OneHex + or + IPv6NoneHex + or + IPv6NoneHex2 + or + IPv6NoneHex3 + ')';

  /**
   * IPvFuture = "v" 1*HEXDIG "." 1*( unreserved / sub-delims / ":" )
   */
  internals.rfc3986.IPvFuture = 'v' + hexDigitOnly + '+\\.[' + unreserved + subDelims + ':]+';

  /**
   * scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
   */
  internals.rfc3986.scheme = alphaOnly + '[' + alpha + digit + '+-\\.]*';

  /**
   * userinfo = *( unreserved / pct-encoded / sub-delims / ":" )
   */
  var userinfo = '[' + unreserved + pctEncoded + subDelims + ':]*';

  /**
   * IP-literal = "[" ( IPv6address / IPvFuture  ) "]"
   */
  var IPLiteral = '\\[(?:' + internals.rfc3986.IPv6address + or + internals.rfc3986.IPvFuture + ')\\]';

  /**
   * reg-name = *( unreserved / pct-encoded / sub-delims )
   */
  var regName = '[' + unreserved + pctEncoded + subDelims + ']{0,255}';

  /**
   * host = IP-literal / IPv4address / reg-name
   */
  var host = '(?:' + IPLiteral + or + internals.rfc3986.IPv4address + or + regName + ')';

  /**
   * port = *DIGIT
   */
  var port = digitOnly + '*';

  /**
   * authority   = [ userinfo "@" ] host [ ":" port ]
   */
  var authority = '(?:' + userinfo + '@)?' + host + '(?::' + port + ')?';

  /**
   * segment       = *pchar
   * segment-nz    = 1*pchar
   * path          = path-abempty    ; begins with "/" or is empty
   *               / path-absolute   ; begins with "/" but not "//"
   *               / path-noscheme   ; begins with a non-colon segment
   *               / path-rootless   ; begins with a segment
   *               / path-empty      ; zero characters
   * path-abempty  = *( "/" segment )
   * path-absolute = "/" [ segment-nz *( "/" segment ) ]
   * path-rootless = segment-nz *( "/" segment )
   */
  var segment = pcharOnly + '*';
  var segmentNz = pcharOnly + '+';
  var segmentNzNc = '[' + unreserved + pctEncoded + subDelims + '@' + ']+';
  var pathEmpty = '';
  var pathAbEmpty = '(?:\\/' + segment + ')*';
  var pathAbsolute = '\\/(?:' + segmentNz + pathAbEmpty + ')?';
  var pathRootless = segmentNz + pathAbEmpty;
  var pathNoScheme = segmentNzNc + pathAbEmpty;

  /**
   * hier-part = "//" authority path
   */
  internals.rfc3986.hierPart = '(?:' + '(?:\\/\\/' + authority + pathAbEmpty + ')' + or + pathAbsolute + or + pathRootless + ')';

  /**
   * relative-part = "//" authority path-abempty
   *                 / path-absolute
   *                 / path-noscheme
   *                 / path-empty
   */
  internals.rfc3986.relativeRef = '(?:' + '(?:\\/\\/' + authority + pathAbEmpty + ')' + or + pathAbsolute + or + pathNoScheme + or + pathEmpty + ')';

  /**
   * query = *( pchar / "/" / "?" )
   */
  internals.rfc3986.query = '[' + pchar + '\\/\\?]*(?=#|$)'; //Finish matching either at the fragment part or end of the line.

  /**
   * fragment = *( pchar / "/" / "?" )
   */
  internals.rfc3986.fragment = '[' + pchar + '\\/\\?]*';
};

internals.generate();

module.exports = internals.rfc3986;
