package br.com.pietroalves.dev.ritmo.user;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

/** Traduz {@code Theme.DARK} (Java) para {@code 'dark'} (banco) e vice-versa. */
@Converter(autoApply = true) // vale para todo campo do tipo Theme
public class ThemeConverter implements AttributeConverter<Theme, String> {

    @Override
    public String convertToDatabaseColumn(Theme theme) {
        return theme == null ? null : theme.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public Theme convertToEntityAttribute(String value) {
        return value == null ? null : Theme.valueOf(value.toUpperCase(Locale.ROOT));
    }
}
