package br.com.pietroalves.dev.ritmo.user;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Preferências do usuário: relação 1 para 1 com {@link User}. */
@Entity
@Table(name = "user_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSettings {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId // a chave primária desta tabela é o id do usuário
    @JoinColumn(name = "user_id")
    private User user;

    // Os valores iniciais repetem o DEFAULT do SQL: o Hibernate envia todas as colunas no INSERT.
    @Setter
    private String timezone = "America/Sao_Paulo";

    @Setter
    private String locale = "pt-BR";

    /** 0 = domingo, 1 = segunda. É {@code short} porque a coluna é SMALLINT. */
    @Setter
    private short weekStartsOn = 1;

    @Setter
    private Theme theme = Theme.DARK;

    @Setter
    private String currency = "BRL";

    @Setter
    private int dailyCapacityMinutes = 360;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public UserSettings(User user) {
        this.user = user;
    }
}
